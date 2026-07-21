import {
  ensureScheduleSessions,
  rebuildScheduleSessionsFromRawMatches
} from "../facts/scheduleSessionsStore.js";
import { buildCronsFromScheduleState } from "./cronBuckets.js";
import { runScheduleApply } from "./scheduleApplyRunner.js";
import { buildScheduleState } from "./schedulePlanBuilder.js";
import {
  areCronsApplied,
  readScheduleState,
  recordAppliedCrons,
  ScheduleStateSchemaError,
  writeScheduleState
} from "./scheduleState.js";

function readScheduleNow(scheduledTimeMs) {
  const now = new Date(scheduledTimeMs);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduledTimeMs: ${scheduledTimeMs}`);
  return now;
}

function assertTournaments(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
}

async function ensureScheduleRuntime(env, tournaments) {
  return Promise.all(tournaments.map(async tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    return { slug, scheduleSessions: await ensureScheduleSessions(env, tournament) };
  }));
}

async function rebuildScheduleRuntime(env, tournaments) {
  return Promise.all(tournaments.map(async tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    return { slug, scheduleSessions: await rebuildScheduleSessionsFromRawMatches(env, tournament) };
  }));
}

async function runScheduleStateUpdate(env, tournaments, runtime, now, previousState, applyReason, logLabel, options) {
  const sessionsBySlug = new Map(runtime.map(({ slug, scheduleSessions }) => [slug, { sessions: scheduleSessions.sessions }]));
  const state = buildScheduleState(tournaments, sessionsBySlug, now, previousState);
  const desiredCrons = buildCronsFromScheduleState(state);

  let applyResult = "unchanged";
  if (!areCronsApplied(state, desiredCrons)) {
    applyResult = await runScheduleApply(env, desiredCrons, applyReason, options);
    if (applyResult === "applied") recordAppliedCrons(state, desiredCrons);
  }
  await writeScheduleState(env, state);
  console.log(`[SCHED:${logLabel}] date=${state.date} crons=${desiredCrons.join(",")} apply=${applyResult}`);
}

export async function runScheduleMaintenance(env, tournaments, scheduledTimeMs, options = {}) {
  assertTournaments(tournaments);
  const now = readScheduleNow(scheduledTimeMs);
  const runtime = await ensureScheduleRuntime(env, tournaments);
  const previousState = await readScheduleState(env);
  await runScheduleStateUpdate(
    env,
    tournaments,
    runtime,
    now,
    previousState,
    "RECONCILE",
    "STATE",
    options
  );
}

export async function rebuildSchedule(env, tournaments, scheduledTimeMs = Date.now(), options = {}) {
  assertTournaments(tournaments);
  const now = readScheduleNow(scheduledTimeMs);
  const runtime = await rebuildScheduleRuntime(env, tournaments);
  let previousState;
  try {
    previousState = await readScheduleState(env);
  } catch (error) {
    if (!(error instanceof ScheduleStateSchemaError)) throw error;
    console.error(`[SCHED:REBUILD] replacing invalid ScheduleState: ${error.cause.message}`);
    previousState = null;
  }
  await runScheduleStateUpdate(env, tournaments, runtime, now, previousState, "REBUILD", "REBUILD", options);
}
