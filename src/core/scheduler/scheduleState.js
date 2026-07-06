import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { timePolicy } from "../../utils/timePolicy.js";
import { assertScheduleMetaFields } from "../facts/scheduleMetaStore.js";

export async function readScheduleState(env) {
  const kv = env["lol-stats-kv"];
  const state = await kv.get(kvKeys.scheduleState(), { type: "json" });
  if (state == null) return null;
  if (typeof state !== "object" || Array.isArray(state)) throw new Error("ScheduleState must be a JSON object");
  if (!state.slugStates || typeof state.slugStates !== "object" || Array.isArray(state.slugStates)) {
    throw new Error("ScheduleState.slugStates must be a JSON object");
  }
  return state;
}

export async function writeScheduleState(env, state) {
  await env["lol-stats-kv"].put(kvKeys.scheduleState(), JSON.stringify(state));
}

export function recordAppliedSchedules(state, schedules) {
  state.schedules = schedules;
  return state;
}

export function areSchedulesApplied(state, schedules) {
  if (state.schedules === undefined) return false;
  if (!Array.isArray(state.schedules)) throw new Error("ScheduleState.schedules must be an array");
  return JSON.stringify(state.schedules) === JSON.stringify(schedules);
}

export function buildSlugScheduleState(phase = "idle", window = null) {
  return {
    phase,
    playStartHour: window?.startHour ?? null,
    playEndHour: window?.endHour ?? null
  };
}

export function hasPlayWindow(slugState) {
  return slugState.playStartHour !== null || slugState.playEndHour !== null;
}

function assertPlayWindow(slug, slugState) {
  const startHour = slugState.playStartHour;
  const endHour = slugState.playEndHour;
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) {
    throw new Error(`ScheduleState.slugStates.${slug} play window missing`);
  }
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    throw new Error(`ScheduleState.slugStates.${slug} play window out of range: ${startHour}-${endHour}`);
  }
  if (startHour > endHour) {
    throw new Error(`ScheduleState.slugStates.${slug} play window invalid: ${startHour}-${endHour}`);
  }
}

export function isNowInPlayWindow(slugState, nowUtc) {
  const hour = timePolicy.getBusinessHour(nowUtc);
  return hour >= slugState.playStartHour && hour <= slugState.playEndHour;
}

export function derivePhase(slugState, meta, nowUtc) {
  if (!hasPlayWindow(slugState)) return "idle";
  const fields = assertScheduleMetaFields("ScheduleMeta", meta);
  const hasUnfinished = fields.hasHistoryUnfinished || fields.todayUnfinished > 0;
  return hasUnfinished && isNowInPlayWindow(slugState, nowUtc) ? "play" : "idle";
}

export function buildIdleState(today, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const slugStates = {};
  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    slugStates[slug] = buildSlugScheduleState();
  }
  return { date: today, slugStates };
}

export function assertSlugScheduleState(slug, slugState) {
  if (!slugState || typeof slugState !== "object" || Array.isArray(slugState)) {
    throw new Error(`ScheduleState.slugStates.${slug} must be a JSON object`);
  }
  if (!["idle", "play"].includes(slugState.phase)) {
    throw new Error(`Invalid scheduler phase for ${slug}: ${slugState.phase}`);
  }
  if (slugState.playStartHour === null && slugState.playEndHour === null) {
    if (slugState.phase === "play") {
      throw new Error(`ScheduleState.slugStates.${slug} play phase requires a window`);
    }
    return;
  }
  if (slugState.playStartHour === null || slugState.playEndHour === null) {
    throw new Error(`ScheduleState.slugStates.${slug} play window incomplete`);
  }
  assertPlayWindow(slug, slugState);
}

export function alignStateSlugsWithTournaments(state, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const expectedSlugs = new Set();
  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    expectedSlugs.add(slug);
  }

  let changed = false;
  for (const slug of expectedSlugs) {
    if (!Object.prototype.hasOwnProperty.call(state.slugStates, slug)) {
      state.slugStates[slug] = buildSlugScheduleState();
      changed = true;
    }
  }

  for (const existingSlug of Object.keys(state.slugStates)) {
    if (expectedSlugs.has(existingSlug)) continue;
    delete state.slugStates[existingSlug];
    changed = true;
  }

  return changed;
}
