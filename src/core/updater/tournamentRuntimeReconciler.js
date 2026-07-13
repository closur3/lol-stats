import { readTournamentConfig } from "../facts/tournamentConfigReader.js";
import { buildTournamentApplyState } from "../facts/tournamentConfigFingerprint.js";
import { writeTournamentApplyState } from "../facts/tournamentApplyState.js";
import { runScheduleMaintenance } from "../scheduler/scheduleMaintenanceRunner.js";
import { migrateArchiveTournaments } from "./archiveMigration.js";
import { forceActiveTournaments } from "./activeForceRunner.js";
import { deleteActiveRuntimeFacts } from "./activeTournamentDeletion.js";
import { deriveTournamentTransition } from "./tournamentTransition.js";
import { assertTournamentRuntimeMatchesConfig } from "./tournamentRuntimeValidator.js";
import { resolveTournamentApplyBaseline } from "./tournamentApplyBaseline.js";

function transitionSlugs(transition) {
  return [...transition.added, ...transition.updated, ...transition.archived, ...transition.dropped];
}

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
  const previousApplyState = await resolveTournamentApplyBaseline(env, config, desiredApplyState);
  const transition = deriveTournamentTransition(config.archive, desiredApplyState, previousApplyState);
  logTransition(transition);

  await migrateArchiveTournaments(env, config.archive, new Set(transition.archived));
  await forceActiveTournaments(env, config.active, new Set([...transition.added, ...transition.updated]));
  await Promise.all(transition.dropped.map(slug => deleteActiveRuntimeFacts(env, slug)));
  await runScheduleMaintenance(env, config.active, scheduledTimeMs, scheduleOptions);

  await assertTournamentRuntimeMatchesConfig(env, config);
  await assertConfigUnchanged(env, desiredApplyState.configDigest);
  await writeTournamentApplyState(env, desiredApplyState);
  return { config, transition, changed: transitionSlugs(transition).length > 0 };
}
