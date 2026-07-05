import { timePolicy } from "../../utils/timePolicy.js";
import { ensureScheduleMetas } from "../facts/scheduleMetaStore.js";
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
  buildNextLeagueState,
  requireScheduleMeta
} from "./schedulePlanBuilder.js";

export async function reconcileLeagueStates(env, tournaments, nowMs = Date.now(), options = {}) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const now = new Date(nowMs);
  const today = timePolicy.getBusinessDateKey(now);
  const state = await readScheduleControl(env);
  if (!state || state.date !== today) return;

  const metas = await ensureScheduleMetas(env, tournaments);
  const metasBySlug = new Map(metas.map(meta => [meta.slug, meta]));
  const aligned = alignStateLeaguesWithTournaments(state, tournaments);
  const changed = [];

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    const leagueState = state.leagues[slug];
    assertLeagueState(slug, leagueState);

    const nextLeagueState = buildNextLeagueState(slug, leagueState, requireScheduleMeta(metasBySlug, slug), now);
    if (JSON.stringify(leagueState) !== JSON.stringify(nextLeagueState)) {
      state.leagues[slug] = nextLeagueState;
      changed.push(`${slug}:${leagueState.phase}->${nextLeagueState.phase}`);
    }
  }

  if (!aligned && changed.length === 0) {
    const schedules = collectSchedulesFromState(state);
    if (areSchedulesApplied(state, schedules)) return;
    const applyResult = await runScheduleApply(env, schedules, "REAPPLY", options);
    if (applyResult === "applied") recordAppliedSchedules(state, schedules);
    await writeScheduleControl(env, state);
    return;
  }
  const schedules = collectSchedulesFromState(state);
  if (!areSchedulesApplied(state, schedules)) {
    const applyResult = await runScheduleApply(env, schedules, "RECONCILE", options);
    if (applyResult === "applied") recordAppliedSchedules(state, schedules);
  }
  await writeScheduleControl(env, state);
  const details = changed.length > 0 ? changed.join(",") : "aligned-only";
  console.log(`[SCHED:STATE] date=${today} ${details}`);
}
