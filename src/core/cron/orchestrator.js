import { readActiveConfig } from "../updater/activeConfigReader.js";
import { readPreviousRawMatchesMap } from "../facts/rawMatchesStore.js";
import { detectRevisionChanges } from "../updater/revisionDetector.js";
import { runActiveUpdate } from "../updater/activeUpdateRunner.js";
import { commitRevisionWrites } from "../updater/revWriter.js";
import { reconcileCurrentScheduleState, runScheduleMaintenance } from "../scheduler/scheduleMaintenanceRunner.js";
import { resolveScheduledExecutionScope } from "../scheduler/scheduledExecutionScope.js";
import { resolveScheduleOptions } from "../scheduler/scheduleOptions.js";
import { migrateArchiveSnapshotsFromActiveFacts } from "../updater/archiveMigration.js";
import { Logger } from "../../infrastructure/logger.js";

function filterTournaments(tournaments, slugs) {
  return tournaments.filter(tournament => slugs.has(tournament.slug));
}

async function resolveCronTarget(env, event, tournaments, scheduleOptions) {
  const target = await resolveScheduledExecutionScope(env, event.scheduledTime, event.cron);
  if (target.type === 'none') {
    await reconcileCurrentScheduleState(env, tournaments, event.scheduledTime, scheduleOptions);
  }
  return target;
}

async function detectRevisionChangesForTarget(env, tournaments, target) {
  const scopedTournaments = target.type === 'scoped'
    ? filterTournaments(tournaments, target.slugs)
    : tournaments;
  const { changedSlugs, revidChanges, pendingRevisionWrites, checkedSlugs } = await detectRevisionChanges(env, scopedTournaments);
  console.log(`[REV:SUMMARY] checked=${checkedSlugs} changed=${changedSlugs.size}`);

  return { changedSlugs, revidChanges, pendingRevisionWrites };
}

async function runRevisionPath(env, tournaments, revisionResult, logger) {
  const { changedSlugs, revidChanges, pendingRevisionWrites } = revisionResult;
  if (changedSlugs.size > 0) {
    const changedTournaments = filterTournaments(tournaments, changedSlugs);
    const rawMatchesBySlug = await readPreviousRawMatchesMap(env, changedTournaments);
    console.log(`[FANDOM:SYNC] slugs=${Array.from(changedSlugs).join(", ")}`);
    await runActiveUpdate(env, tournaments, rawMatchesBySlug, false, changedSlugs, {
      forceWrite: false,
      revidChanges,
      pendingRevisionWrites
    }, logger);
  } else {
    await commitRevisionWrites(env, pendingRevisionWrites);
  }
}

export async function runCron(env, event) {
  const logger = new Logger();
  const scheduleOptions = resolveScheduleOptions(env);
  const tournaments = await readActiveConfig(env);
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }

  await migrateArchiveSnapshotsFromActiveFacts(env, tournaments);
  const target = await resolveCronTarget(env, event, tournaments, scheduleOptions);
  if (target.type === 'none') return;

  const revisionResult = await detectRevisionChangesForTarget(env, tournaments, target);
  await runRevisionPath(env, tournaments, revisionResult, logger);
  await runScheduleMaintenance(env, tournaments, event.scheduledTime, scheduleOptions);
}
