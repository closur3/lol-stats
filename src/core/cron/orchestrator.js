import { readActiveConfig } from "../updater/activeConfigReader.js";
import { readTeamsConfig } from "../updater/teamsConfigReader.js";
import { readPreviousRawMatchesMap } from "../facts/rawMatchesStore.js";
import { detectRevisionChanges } from "../updater/revisionDetector.js";
import { runActiveUpdate } from "../updater/activeUpdateRunner.js";
import { commitRevisionWrites } from "../updater/revWriter.js";
import { runScheduleMaintenance } from "../scheduler/scheduleMaintenanceRunner.js";
import { reconcileLeagueStates } from "../scheduler/scheduleStateReconciler.js";
import { resolveScheduledExecutionSlugs } from "../scheduler/scheduleReconciler.js";
import { resolveScheduleOptions } from "../scheduler/scheduleOptions.js";
import { migrateArchiveSnapshotsFromActiveFacts } from "../updater/archiveMigration.js";
import { Logger } from "../../infrastructure/logger.js";

function filterTournaments(tournaments, slugs) {
  return tournaments.filter(tournament => slugs.has(tournament.slug));
}

async function resolveCronTarget(env, event, tournaments, scheduleOptions) {
  const target = await resolveScheduledExecutionSlugs(env, event.scheduledTime, event.cron);
  if (target.type === 'none') {
    await reconcileLeagueStates(env, tournaments, event.scheduledTime, scheduleOptions);
  }
  return target;
}

async function detectRevisionChangesForTarget(env, tournaments, target) {
  const scopedTournaments = target.type === 'scoped'
    ? filterTournaments(tournaments, target.slugs)
    : tournaments;
  const { changedSlugs, revidChanges, pendingRevisionWrites, hasErrors, checkedSlugs } = await detectRevisionChanges(env, scopedTournaments);
  console.log(`[REV:SUMMARY] checked=${checkedSlugs} changed=${changedSlugs.size} errors=${hasErrors ? 1 : 0}`);

  return { changedSlugs, revidChanges, pendingRevisionWrites };
}

async function runRevisionPath(env, tournaments, teamsRaw, revisionResult, logger) {
  const { changedSlugs, revidChanges, pendingRevisionWrites } = revisionResult;
  if (changedSlugs.size > 0) {
    const changedTournaments = filterTournaments(tournaments, changedSlugs);
    const rawMatchesBySlug = await readPreviousRawMatchesMap(env, changedTournaments);
    console.log(`[FANDOM:SYNC] slugs=${Array.from(changedSlugs).join(", ")}`);
    await runActiveUpdate(env, tournaments, teamsRaw, rawMatchesBySlug, false, changedSlugs, {
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
  const [tournaments, teamsRaw] = await Promise.all([
    readActiveConfig(env),
    readTeamsConfig(env)
  ]);
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }

  await migrateArchiveSnapshotsFromActiveFacts(env, tournaments);
  const target = await resolveCronTarget(env, event, tournaments, scheduleOptions);
  if (target.type === 'none') return;

  const revisionResult = await detectRevisionChangesForTarget(env, tournaments, target);
  await runRevisionPath(env, tournaments, teamsRaw, revisionResult, logger);
  await runScheduleMaintenance(env, tournaments, event.scheduledTime, scheduleOptions);
}
