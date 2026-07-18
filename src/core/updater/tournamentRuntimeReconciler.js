import { readTournamentConfig } from "../facts/tournamentConfigReader.js";
import { buildTournamentApplyState } from "../facts/tournamentConfigFingerprint.js";
import { writeTournamentApplyState } from "../facts/tournamentApplyState.js";
import { rebuildSchedule } from "../scheduler/scheduleMaintenanceRunner.js";
import { migrateArchiveTournaments } from "./archiveMigration.js";
import { rebuildActiveTournaments } from "./activeRebuildRunner.js";
import { deleteActiveRuntimeFacts } from "./activeTournamentDeletion.js";
import { deriveTournamentTransition } from "./tournamentTransition.js";
import { assertActiveRuntimeMatchesConfig } from "./activeRuntimeValidator.js";
import { resolveTournamentApplyBaseline } from "./tournamentApplyBaseline.js";

function logTransition(transition) {
  console.log(
    `[TOURNAMENT:RECONCILE] added=${transition.added.join(",")} updated=${transition.updated.join(",")} archived=${transition.archived.join(",")} dropped=${transition.dropped.join(",")}`
  );
}

async function assertConfigUnchanged(env, expectedDigest) {
  const currentConfig = await readTournamentConfig(env);
  const currentApplyState = await buildTournamentApplyState(currentConfig);
  if (currentApplyState.configDigest !== expectedDigest) {
    throw new Error("TournamentConfig changed during runtime reconciliation");
  }
}

export async function reconcileTournamentRuntime(env, scheduledTimeMs, scheduleOptions) {
  if (!Number.isFinite(scheduledTimeMs)) throw new Error("scheduledTimeMs must be finite");
  if (!scheduleOptions || typeof scheduleOptions !== "object" || Array.isArray(scheduleOptions)) {
    throw new Error("scheduleOptions must be an object");
  }

  const config = await readTournamentConfig(env);
  const desiredApplyState = await buildTournamentApplyState(config);
  const baseline = await resolveTournamentApplyBaseline(env, config, desiredApplyState);
  if (baseline.applyState.configDigest === desiredApplyState.configDigest) {
    const transition = { added: [], updated: [], archived: [], dropped: [] };
    if (!baseline.checkpointPresent) {
      await assertConfigUnchanged(env, desiredApplyState.configDigest);
      await writeTournamentApplyState(env, desiredApplyState);
    }
    return { config, transition, configChanged: false };
  }

  const previousApplyState = baseline.applyState;
  const transition = deriveTournamentTransition(config.archive, desiredApplyState, previousApplyState);
  logTransition(transition);

  await migrateArchiveTournaments(env, config.archive, new Set(transition.archived));
  const rebuildReasons = new Map([
    ...transition.added.map(slug => [slug, "added"]),
    ...transition.updated.map(slug => [slug, "updated"])
  ]);
  await rebuildActiveTournaments(env, config.active, rebuildReasons);
  await Promise.all(transition.dropped.map(slug => deleteActiveRuntimeFacts(env, slug)));
  await rebuildSchedule(env, config.active, scheduledTimeMs, scheduleOptions);

  await assertActiveRuntimeMatchesConfig(env, config.active);
  await assertConfigUnchanged(env, desiredApplyState.configDigest);
  await writeTournamentApplyState(env, desiredApplyState);
  return { config, transition, configChanged: true };
}
