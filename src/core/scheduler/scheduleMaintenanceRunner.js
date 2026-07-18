import { buildScheduleCarryover } from "../analysis/scheduleCarryover.js";
import {
  readExistingScheduleCarryover,
  readScheduleCarryover,
  writeScheduleCarryover
} from "../facts/scheduleCarryoverStore.js";
import {
  ensureScheduleSessions,
  rebuildScheduleSessionsFromRawMatches
} from "../facts/scheduleSessionsStore.js";
import { buildCronsFromScheduleState } from "./cronBuckets.js";
import { runScheduleApply } from "./scheduleApplyRunner.js";
import { buildScheduleState } from "./schedulePlanBuilder.js";
import { areCronsApplied, readScheduleState, recordAppliedCrons, writeScheduleState } from "./scheduleState.js";

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
    const [scheduleSessions, previousCarryover] = await Promise.all([
      ensureScheduleSessions(env, tournament),
      readScheduleCarryover(env, slug)
    ]);
    return { slug, scheduleSessions, previousCarryover };
  }));
}

async function rebuildScheduleRuntime(env, tournaments) {
  return Promise.all(tournaments.map(async tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    const [scheduleSessions, previousCarryover] = await Promise.all([
      rebuildScheduleSessionsFromRawMatches(env, tournament),
      readExistingScheduleCarryover(env, slug)
    ]);
    return { slug, scheduleSessions, previousCarryover };
  }));
}

function buildCarryovers(runtime, now) {
  return new Map(runtime.map(({ slug, scheduleSessions, previousCarryover }) => {
    const previous = previousCarryover === null ? null : { entries: previousCarryover.entries };
    const carryover = buildScheduleCarryover(previous, { sessions: scheduleSessions.sessions }, now);
    return [slug, carryover];
  }));
}

async function writeCarryovers(env, carryoversBySlug, runtime) {
  const previousBySlug = new Map(runtime.map(({ slug, previousCarryover }) => [slug, previousCarryover]));
  await Promise.all(Array.from(carryoversBySlug, ([slug, carryover]) => {
    const previous = previousBySlug.get(slug);
    if (previous !== null && JSON.stringify(previous.entries) === JSON.stringify(carryover.entries)) return null;
    return writeScheduleCarryover(env, slug, carryover);
  }));
}

async function writeRuntimeCarryovers(env, runtime, now) {
  const carryoversBySlug = buildCarryovers(runtime, now);
  await writeCarryovers(env, carryoversBySlug, runtime);
}

async function runScheduleStateUpdate(env, tournaments, runtime, now, appliedCrons, applyReason, logLabel, options) {
  const sessionsBySlug = new Map(runtime.map(({ slug, scheduleSessions }) => [slug, { sessions: scheduleSessions.sessions }]));
  const state = buildScheduleState(tournaments, sessionsBySlug, now, appliedCrons);
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
  await writeRuntimeCarryovers(env, runtime, now);
  const previousState = await readScheduleState(env);
  await runScheduleStateUpdate(
    env,
    tournaments,
    runtime,
    now,
    previousState?.appliedCrons || [],
    "RECONCILE",
    "STATE",
    options
  );
}

export async function rebuildSchedule(env, tournaments, scheduledTimeMs = Date.now(), options = {}) {
  assertTournaments(tournaments);
  const now = readScheduleNow(scheduledTimeMs);
  const runtime = await rebuildScheduleRuntime(env, tournaments);
  await writeRuntimeCarryovers(env, runtime, now);
  await runScheduleStateUpdate(env, tournaments, runtime, now, [], "REBUILD", "REBUILD", options);
}
