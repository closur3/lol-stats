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
import { repairActiveSnapshotProjections } from "../updater/activeProjectionMaintenance.js";
import { readTournamentConfig } from "../facts/tournamentConfigReader.js";

function readScheduleNow(scheduledTimeMs) {
  const now = new Date(scheduledTimeMs);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduledTimeMs: ${scheduledTimeMs}`);
  return now;
}

function assertTournaments(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  for (const tournament of tournaments) {
    if (typeof tournament?.name !== "string" || !tournament.name) throw new Error("Tournament tournamentName missing");
  }
}

async function assertCurrentActiveScope(env, tournaments) {
  const { active } = await readTournamentConfig(env);
  const names = tournaments.map(tournament => tournament.name);
  if (active.length !== names.length || active.some((tournament, index) => tournament.name !== names[index])) {
    throw new Error("TournamentConfig.active changed after the schedule scope was read");
  }
}

async function ensureScheduleRuntime(env, tournaments) {
  return Promise.all(tournaments.map(async tournament => ({
    tournamentName: tournament.name,
    scheduleSessions: await ensureScheduleSessions(env, tournament)
  })));
}

async function rebuildScheduleRuntime(env, tournaments) {
  return Promise.all(tournaments.map(async tournament => ({
    tournamentName: tournament.name,
    scheduleSessions: await rebuildScheduleSessionsFromRawMatches(env, tournament)
  })));
}

async function readPreviousScheduleState(env, logLabel) {
  try {
    return await readScheduleState(env);
  } catch (error) {
    if (!(error instanceof ScheduleStateSchemaError)) throw error;
    console.error(`[SCHED:${logLabel}] replacing invalid ScheduleState: ${error.cause.message}`);
    return null;
  }
}

async function runScheduleStateUpdate(env, tournaments, runtime, now, previousState, applyReason, logLabel, options) {
  const sessionsByName = new Map(runtime.map(({ tournamentName, scheduleSessions }) => [tournamentName, { sessions: scheduleSessions.sessions }]));
  const state = buildScheduleState(tournaments, sessionsByName, now, previousState);
  const desiredCrons = buildCronsFromScheduleState(state, tournaments);

  let applyResult = "unchanged";
  if (!areCronsApplied(state, desiredCrons)) {
    applyResult = await runScheduleApply(env, desiredCrons, applyReason, options);
    if (applyResult === "applied") recordAppliedCrons(state, desiredCrons);
  }
  const stateChanged = previousState === null || JSON.stringify(previousState) !== JSON.stringify(state);
  if (stateChanged) await writeScheduleState(env, state);
  console.log(`[SCHED:${logLabel}] date=${state.date} crons=${desiredCrons.join(",")} apply=${applyResult}`);
  return { scheduleState: state, scheduleSessionsByName: sessionsByName };
}

export async function runScheduleMaintenance(env, tournaments, scheduledTimeMs, options = {}) {
  assertTournaments(tournaments);
  const now = readScheduleNow(scheduledTimeMs);
  await assertCurrentActiveScope(env, tournaments);
  const runtime = await ensureScheduleRuntime(env, tournaments);
  await repairActiveSnapshotProjections(env, tournaments);
  const previousState = await readPreviousScheduleState(env, "STATE");
  return runScheduleStateUpdate(
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
  await assertCurrentActiveScope(env, tournaments);
  const runtime = await rebuildScheduleRuntime(env, tournaments);
  await repairActiveSnapshotProjections(env, tournaments);
  const previousState = await readPreviousScheduleState(env, "REBUILD");
  return runScheduleStateUpdate(env, tournaments, runtime, now, previousState, "REBUILD", "REBUILD", options);
}
