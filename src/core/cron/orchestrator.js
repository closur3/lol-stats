import { readExistingRawMatchesByName } from "../facts/rawMatchesStore.js";
import { detectRevisionChanges } from "../updater/revisionDetector.js";
import { prepareActiveUpdate } from "../updater/activeUpdatePreparer.js";
import { commitRevisionWrites } from "../updater/revWriter.js";
import { runScheduleMaintenance } from "../scheduler/scheduleMaintenanceRunner.js";
import { resolveScheduledExecutionScope } from "../scheduler/scheduledExecutionScope.js";
import { resolveScheduleOptions } from "../scheduler/scheduleOptions.js";
import { reconcileTournamentRuntime } from "../updater/tournamentRuntimeReconciler.js";
import { assertRawMatchesAvailable } from "../facts/rawMatchesStore.js";
import { commitActiveLogWrites } from "../updater/logPersistence.js";
import { commitActiveUpdate } from "../updater/activeUpdateCommitter.js";
import { rejectActiveUpdate } from "../updater/activeUpdateRejection.js";

function filterTournaments(tournaments, names) {
  return tournaments.filter(tournament => names.has(tournament.name));
}

async function detectRevisionChangesForTarget(env, tournaments, target) {
  const scopedTournaments = target.type === 'scoped'
    ? filterTournaments(tournaments, target.names)
    : tournaments;
  const { changedNames, revidChanges, pendingRevisionWrites, checkedNames } = await detectRevisionChanges(env, scopedTournaments);
  console.log(`[REV:SUMMARY] checked=${checkedNames} changed=${changedNames.size}`);

  return { changedNames, revidChanges, pendingRevisionWrites };
}

async function prepareRevisionPath(env, tournaments, revisionResult) {
  const { changedNames, revidChanges, pendingRevisionWrites } = revisionResult;
  let activeUpdatePlan = null;
  if (changedNames.size > 0) {
    const changedTournaments = filterTournaments(tournaments, changedNames);
    const rawMatchesByName = await readExistingRawMatchesByName(env, changedTournaments);
    console.log(`[FANDOM:SYNC] names=${Array.from(changedNames).join(", ")}`);
    activeUpdatePlan = await prepareActiveUpdate(env, tournaments, rawMatchesByName, changedNames, {
      reasonsByName: new Map(Array.from(changedNames, tournamentName => [tournamentName, "revision"])),
      rebuild: false,
      revidChanges
    });
    if (!activeUpdatePlan.accepted) await rejectActiveUpdate(env, activeUpdatePlan);
  }
  return { pendingRevisionWrites, activeUpdatePlan };
}

export async function runCron(env, event) {
  const scheduleOptions = resolveScheduleOptions(env);
  const reconcileResult = await reconcileTournamentRuntime(env, event.scheduledTime, scheduleOptions);
  const { config } = reconcileResult;
  const tournaments = config.active;
  await assertRawMatchesAvailable(env, tournaments);
  const scheduleRuntime = reconcileResult.scheduleRuntime
    ?? await runScheduleMaintenance(env, tournaments, event.scheduledTime, scheduleOptions);

  const target = resolveScheduledExecutionScope(scheduleRuntime, tournaments, event.scheduledTime, event.cron);
  if (target.type === 'none') return;

  const revisionResult = await detectRevisionChangesForTarget(env, tournaments, target);
  const revisionPlan = await prepareRevisionPath(env, tournaments, revisionResult);
  if (revisionPlan.activeUpdatePlan) {
    await commitActiveUpdate(env, revisionPlan.activeUpdatePlan);
    await runScheduleMaintenance(env, tournaments, event.scheduledTime, scheduleOptions);
  }
  await commitRevisionWrites(env, revisionPlan.pendingRevisionWrites);
  if (revisionPlan.activeUpdatePlan) {
    await commitActiveLogWrites(env, revisionPlan.activeUpdatePlan.activeLogWrites);
  }
}
