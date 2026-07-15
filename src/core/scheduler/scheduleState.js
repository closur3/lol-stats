import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { timePolicy } from "../../utils/timePolicy.js";

const phases = new Set(["offday", "idle", "play", "done"]);

function assertCronWindow(slug, window) {
  if (window === null) return;
  if (!window || typeof window !== "object" || Array.isArray(window)) {
    throw new Error(`ScheduleState.slugStates.${slug}.cronWindow must be a JSON object or null`);
  }
  const { startHour, endHour } = window;
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 23 || startHour > endHour) {
    throw new Error(`ScheduleState.slugStates.${slug}.cronWindow is invalid`);
  }
}

function assertTargetSession(slug, target) {
  if (target === null) return;
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new Error(`ScheduleState.slugStates.${slug}.targetSession must be a JSON object or null`);
  }
  if (typeof target.overviewPage !== "string" || target.overviewPage.trim() === "") throw new Error(`ScheduleState ${slug} target overviewPage missing`);
  if (typeof target.tab !== "string") throw new Error(`ScheduleState ${slug} target tab missing`);
  if (!Number.isInteger(target.matchDay) || target.matchDay < 1) throw new Error(`ScheduleState ${slug} target matchDay invalid`);
  if (!Number.isInteger(target.startTimestamp) || target.startTimestamp < 1) throw new Error(`ScheduleState ${slug} target startTimestamp invalid`);
}

export function assertSlugScheduleState(slug, slugState) {
  if (!slugState || typeof slugState !== "object" || Array.isArray(slugState)) {
    throw new Error(`ScheduleState.slugStates.${slug} must be a JSON object`);
  }
  if (!phases.has(slugState.phase)) throw new Error(`Invalid scheduler phase for ${slug}: ${slugState.phase}`);
  assertTargetSession(slug, slugState.targetSession);
  assertCronWindow(slug, slugState.cronWindow);
  if ((slugState.phase === "idle" || slugState.phase === "play") && slugState.cronWindow === null) {
    throw new Error(`ScheduleState ${slug} ${slugState.phase} phase requires cronWindow`);
  }
  if ((slugState.phase === "done" || slugState.phase === "offday") && slugState.cronWindow !== null) {
    throw new Error(`ScheduleState ${slug} ${slugState.phase} phase cannot have cronWindow`);
  }
  return slugState;
}

function normalizeScheduleState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("ScheduleState must be a JSON object");
  if (typeof state.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(state.date)) throw new Error("ScheduleState.date is invalid");
  if (!state.slugStates || typeof state.slugStates !== "object" || Array.isArray(state.slugStates)) {
    throw new Error("ScheduleState.slugStates must be a JSON object");
  }
  if (!Array.isArray(state.appliedCrons) || state.appliedCrons.some(cron => typeof cron !== "string")) {
    throw new Error("ScheduleState.appliedCrons must be an array of strings");
  }
  for (const [slug, slugState] of Object.entries(state.slugStates)) assertSlugScheduleState(slug, slugState);
  return state;
}

export async function readScheduleState(env) {
  const state = await env["lol-stats-kv"].get(kvKeys.scheduleState(), { type: "json" });
  if (state == null) return null;
  return normalizeScheduleState(state);
}

export async function writeScheduleState(env, state) {
  const normalized = normalizeScheduleState(state);
  await env["lol-stats-kv"].put(kvKeys.scheduleState(), JSON.stringify(normalized));
}

export function recordAppliedCrons(state, crons) {
  if (!Array.isArray(crons) || crons.some(cron => typeof cron !== "string")) throw new Error("crons must be an array of strings");
  state.appliedCrons = [...crons];
  return state;
}

export function areCronsApplied(state, crons) {
  return JSON.stringify(state.appliedCrons) === JSON.stringify(crons);
}

export function isNowInCronWindow(slugState, nowUtc) {
  assertSlugScheduleState("scope", slugState);
  if (slugState.cronWindow === null) return false;
  const hour = timePolicy.getAppHour(nowUtc);
  return hour >= slugState.cronWindow.startHour && hour <= slugState.cronWindow.endHour;
}
