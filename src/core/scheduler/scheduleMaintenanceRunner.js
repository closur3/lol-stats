import { timePolicy } from "../../utils/timePolicy.js";
import { restoreMissingScheduleMetaFromRawMatches, rebuildScheduleMetaFromRawMatches } from "../facts/scheduleMetaStore.js";
import {
  alignStateLeaguesWithTournaments,
  areSchedulesApplied,
  assertLeagueState,
  readScheduleControl,
  recordAppliedSchedules,
  writeScheduleControl
} from "./scheduleState.js";
import { collectSchedulesFromState } from "./cronBuckets.js";
import { runScheduleApply } from "./scheduleApplyRunner.js";
import {
  buildDailyScheduleState,
  buildNextLeagueState,
  requireScheduleMeta
} from "./schedulePlanBuilder.js";

async function rebuildScheduleMetasForTournaments(env, tournaments) {
  return Promise.all(
    tournaments.map(async (tournament) => {
      const slug = tournament?.slug;
      if (!slug) throw new Error("Tournament slug missing");
      return rebuildScheduleMetaFromRawMatches(env, slug);
    })
  );
}

async function restoreMissingScheduleMetasForTournaments(env, tournaments) {
  return Promise.all(
    tournaments.map(async (tournament) => {
      const slug = tournament?.slug;
      if (!slug) throw new Error("Tournament slug missing");
      return restoreMissingScheduleMetaFromRawMatches(env, slug);
    })
  );
}

async function planNewScheduleDay(env, tournaments, now, lastDay, options) {
  const rebuiltMetas = await rebuildScheduleMetasForTournaments(env, tournaments);
  const metasBySlug = new Map(rebuiltMetas.map(meta => [meta.slug, meta]));
  const today = timePolicy.getBusinessDateKey(now);
  console.log(`[SCHED:DAY] ${lastDay || "none"} -> ${today}`);
  const state = buildDailyScheduleState(tournaments, metasBySlug, now);
  const schedules = collectSchedulesFromState(state);
  const applyResult = await runScheduleApply(env, schedules, "PLAN", options);
  if (applyResult === "applied") recordAppliedSchedules(state, schedules);
  await writeScheduleControl(env, state);
  console.log(`[SCHED:PLAN] date=${state.date} schedules=${schedules.join(",")} apply=${applyResult}`);
}

async function reconcileCurrentScheduleDay(env, tournaments, state, now, options) {
  const alignmentChanged = alignStateLeaguesWithTournaments(state, tournaments);
  const metas = await restoreMissingScheduleMetasForTournaments(env, tournaments);
  const metasBySlug = new Map(metas.map(meta => [meta.slug, meta]));
  const reconciled = [];

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    const leagueState = state.leagues[slug];
    assertLeagueState(slug, leagueState);

    const nextLeagueState = buildNextLeagueState(slug, leagueState, requireScheduleMeta(metasBySlug, slug), now);
    if (JSON.stringify(leagueState) !== JSON.stringify(nextLeagueState)) {
      state.leagues[slug] = nextLeagueState;
      reconciled.push(`${slug}:${leagueState.phase}->${nextLeagueState.phase}`);
    }
  }

  const hasChanges = alignmentChanged || reconciled.length > 0;
  if (!hasChanges) {
    const schedules = collectSchedulesFromState(state);
    if (areSchedulesApplied(state, schedules)) return;
    const applyResult = await runScheduleApply(env, schedules, "REAPPLY", options);
    if (applyResult === "applied") recordAppliedSchedules(state, schedules);
    await writeScheduleControl(env, state);
    return;
  }

  if (reconciled.length > 0) {
    const today = timePolicy.getBusinessDateKey(now);
    console.log(`[SCHED:STATE] date=${today} ${reconciled.join(",")}`);
  }

  const schedules = collectSchedulesFromState(state);
  if (!areSchedulesApplied(state, schedules)) {
    const applyResult = await runScheduleApply(env, schedules, "RECONCILE", options);
    if (applyResult === "applied") recordAppliedSchedules(state, schedules);
  }
  await writeScheduleControl(env, state);
}

export async function runScheduleMaintenance(env, tournaments, scheduledTimeMs, options = {}) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getBusinessDateKey(now);

  const state = await readScheduleControl(env);
  const lastDay = state?.date || null;

  if (lastDay !== today) {
    await planNewScheduleDay(env, tournaments, now, lastDay, options);
    return;
  }

  await reconcileCurrentScheduleDay(env, tournaments, state, now, options);
}
