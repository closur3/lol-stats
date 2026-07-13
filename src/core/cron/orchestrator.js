import { readExistingRawMatchesBySlug } from "../facts/rawMatchesStore.js";
import { detectRevisionChanges } from "../updater/revisionDetector.js";
import { runActiveUpdate } from "../updater/activeUpdateRunner.js";
import { commitRevisionWrites } from "../updater/revWriter.js";
import { runScheduleMaintenance } from "../scheduler/scheduleMaintenanceRunner.js";
import { resolveScheduledExecutionScope } from "../scheduler/scheduledExecutionScope.js";
import { resolveScheduleOptions } from "../scheduler/scheduleOptions.js";
import { reconcileTournamentRuntime } from "../updater/tournamentRuntimeReconciler.js";

function filterTournaments(tournaments, slugs) {
  return tournaments.filter(tournament => slugs.has(tournament.slug));
}

async function detectRevisionChangesForTarget(env, tournaments, target) {
  const scopedTournaments = target.type === 'scoped'
    ? filterTournaments(tournaments, target.slugs)
    : tournaments;
  const { changedSlugs, revidChanges, pendingRevisionWrites, checkedSlugs } = await detectRevisionChanges(env, scopedTournaments);
  console.log(`[REV:SUMMARY] checked=${checkedSlugs} changed=${changedSlugs.size}`);

  return { changedSlugs, revidChanges, pendingRevisionWrites };
}

async function runRevisionPath(env, tournaments, revisionResult) {
  const { changedSlugs, revidChanges, pendingRevisionWrites } = revisionResult;
  if (changedSlugs.size > 0) {
    const changedTournaments = filterTournaments(tournaments, changedSlugs);
    const rawMatchesBySlug = await readExistingRawMatchesBySlug(env, changedTournaments);
    console.log(`[FANDOM:SYNC] slugs=${Array.from(changedSlugs).join(", ")}`);
    await runActiveUpdate(env, tournaments, rawMatchesBySlug, false, changedSlugs, {
      forceWrite: false,
      revidChanges,
      pendingRevisionWrites
    });
  } else {
    await commitRevisionWrites(env, pendingRevisionWrites);
  }
}

export async function runCron(env, event) {
  const scheduleOptions = resolveScheduleOptions(env);
  const { config } = await reconcileTournamentRuntime(env, event.scheduledTime, scheduleOptions);
  const tournaments = config.active;

  const target = await resolveScheduledExecutionScope(env, event.scheduledTime, event.cron);
  if (target.type === 'none') return;

  const revisionResult = await detectRevisionChangesForTarget(env, tournaments, target);
  await runRevisionPath(env, tournaments, revisionResult);
  await runScheduleMaintenance(env, tournaments, event.scheduledTime, scheduleOptions);
}
