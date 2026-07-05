import { timePolicy } from "../../utils/timePolicy.js";
import { restoreMissingScheduleMetaFromRawMatches } from "../facts/scheduleMetaStore.js";
import {
  alignStateSlugsWithTournaments,
  areSchedulesApplied,
  assertSlugScheduleState,
  readScheduleState,
  recordAppliedSchedules,
  writeScheduleState
} from "./scheduleState.js";
import { collectSchedulesFromState } from "./cronBuckets.js";
import { runScheduleApply } from "./scheduleApplyRunner.js";
import {
  buildNextSlugScheduleState,
  requireScheduleMeta
} from "./schedulePlanBuilder.js";

async function restoreMissingScheduleMetasForTournaments(env, tournaments) {
  return Promise.all(
    tournaments.map(async (tournament) => {
      const slug = tournament?.slug;
      if (!slug) throw new Error("Tournament slug missing");
      return restoreMissingScheduleMetaFromRawMatches(env, slug);
    })
  );
}

export async function reconcileScheduleSlugStates(env, tournaments, nowMs = Date.now(), options = {}) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const now = new Date(nowMs);
  const today = timePolicy.getBusinessDateKey(now);
  const state = await readScheduleState(env);
  if (!state || state.date !== today) return;

  const metas = await restoreMissingScheduleMetasForTournaments(env, tournaments);
  const metasBySlug = new Map(metas.map(meta => [meta.slug, meta]));
  const aligned = alignStateSlugsWithTournaments(state, tournaments);
  const changed = [];

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    const slugState = state.slugStates[slug];
    assertSlugScheduleState(slug, slugState);

    const nextSlugState = buildNextSlugScheduleState(slug, slugState, requireScheduleMeta(metasBySlug, slug), now);
    if (JSON.stringify(slugState) !== JSON.stringify(nextSlugState)) {
      state.slugStates[slug] = nextSlugState;
      changed.push(`${slug}:${slugState.phase}->${nextSlugState.phase}`);
    }
  }

  if (!aligned && changed.length === 0) {
    const schedules = collectSchedulesFromState(state);
    if (areSchedulesApplied(state, schedules)) return;
    const applyResult = await runScheduleApply(env, schedules, "REAPPLY", options);
    if (applyResult === "applied") recordAppliedSchedules(state, schedules);
    await writeScheduleState(env, state);
    return;
  }
  const schedules = collectSchedulesFromState(state);
  if (!areSchedulesApplied(state, schedules)) {
    const applyResult = await runScheduleApply(env, schedules, "RECONCILE", options);
    if (applyResult === "applied") recordAppliedSchedules(state, schedules);
  }
  await writeScheduleState(env, state);
  const details = changed.length > 0 ? changed.join(",") : "aligned-only";
  console.log(`[SCHED:STATE] date=${today} ${details}`);
}
