import { ensureScheduleMeta, rebuildScheduleMetaFromRawMatches } from "../facts/scheduleMetaStore.js";
import { buildCronsFromScheduleState } from "./cronBuckets.js";
import { runScheduleApply } from "./scheduleApplyRunner.js";
import { buildScheduleState } from "./schedulePlanBuilder.js";
import { areCronsApplied, readScheduleState, recordAppliedCrons, writeScheduleState } from "./scheduleState.js";

async function readScheduleMetas(env, tournaments, rebuild) {
  return Promise.all(tournaments.map(async tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    return rebuild
      ? rebuildScheduleMetaFromRawMatches(env, slug)
      : ensureScheduleMeta(env, slug);
  }));
}

async function deriveAndApplySchedule(env, tournaments, scheduledTimeMs, options, rebuildMetas) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const now = new Date(scheduledTimeMs);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduledTimeMs: ${scheduledTimeMs}`);
  const previousState = rebuildMetas ? null : await readScheduleState(env);
  const metas = await readScheduleMetas(env, tournaments, rebuildMetas);
  const metasBySlug = new Map(metas.map(meta => [meta.slug, meta]));
  const previousAppliedCrons = previousState?.appliedCrons || [];
  const state = buildScheduleState(tournaments, metasBySlug, now, previousAppliedCrons);
  const desiredCrons = buildCronsFromScheduleState(state);

  let applyResult = "unchanged";
  if (!areCronsApplied(state, desiredCrons)) {
    applyResult = await runScheduleApply(env, desiredCrons, rebuildMetas ? "REBUILD" : "RECONCILE", options);
    if (applyResult === "applied") recordAppliedCrons(state, desiredCrons);
  }
  await writeScheduleState(env, state);
  console.log(`[SCHED:${rebuildMetas ? "REBUILD" : "STATE"}] date=${state.date} crons=${desiredCrons.join(",")} apply=${applyResult}`);
}

export async function runScheduleMaintenance(env, tournaments, scheduledTimeMs, options = {}) {
  await deriveAndApplySchedule(env, tournaments, scheduledTimeMs, options, false);
}

export async function rebuildSchedule(env, tournaments, scheduledTimeMs = Date.now(), options = {}) {
  await deriveAndApplySchedule(env, tournaments, scheduledTimeMs, options, true);
}
