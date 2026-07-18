import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { timePolicy } from "../../utils/timePolicy.js";
import { parseScheduleSessionKey } from "../scheduleIdentity.js";

const phases = new Set(["offday", "idle", "play", "done"]);

function assertExactFields(value, fields, label) {
  const actual = Object.keys(value);
  if (actual.length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) {
    throw new Error(`${label} fields must match the schema`);
  }
}

function assertCronWindow(slug, window) {
  if (window === null) return;
  if (!window || typeof window !== "object" || Array.isArray(window)) {
    throw new Error(`ScheduleState.controlsBySlug.${slug}.cronWindow must be a JSON object or null`);
  }
  assertExactFields(window, ["startHour", "endHour"], `ScheduleState.controlsBySlug.${slug}.cronWindow`);
  const { startHour, endHour } = window;
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 23 || startHour > endHour) {
    throw new Error(`ScheduleState.controlsBySlug.${slug}.cronWindow is invalid`);
  }
}

function assertTargetSession(slug, target) {
  if (target === null) return;
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new Error(`ScheduleState.controlsBySlug.${slug}.targetSession must be a JSON object or null`);
  }
  assertExactFields(target, ["sessionKey", "startTimestamp"], `ScheduleState.controlsBySlug.${slug}.targetSession`);
  parseScheduleSessionKey(target.sessionKey, `ScheduleState ${slug} target sessionKey`);
  if (!Number.isInteger(target.startTimestamp) || target.startTimestamp < 1) {
    throw new Error(`ScheduleState ${slug} target startTimestamp invalid`);
  }
}

export function assertScheduleControl(slug, control) {
  if (!control || typeof control !== "object" || Array.isArray(control)) {
    throw new Error(`ScheduleState.controlsBySlug.${slug} must be a JSON object`);
  }
  assertExactFields(control, ["phase", "targetSession", "cronWindow"], `ScheduleState.controlsBySlug.${slug}`);
  if (!phases.has(control.phase)) throw new Error(`Invalid scheduler phase for ${slug}: ${control.phase}`);
  assertTargetSession(slug, control.targetSession);
  assertCronWindow(slug, control.cronWindow);
  if ((control.phase === "idle" || control.phase === "play") && control.cronWindow === null) {
    throw new Error(`ScheduleState ${slug} ${control.phase} phase requires cronWindow`);
  }
  if ((control.phase === "idle" || control.phase === "play") && control.targetSession === null) {
    throw new Error(`ScheduleState ${slug} ${control.phase} phase requires targetSession`);
  }
  if ((control.phase === "done" || control.phase === "offday") && control.cronWindow !== null) {
    throw new Error(`ScheduleState ${slug} ${control.phase} phase cannot have cronWindow`);
  }
  return control;
}

function normalizeScheduleState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("ScheduleState must be a JSON object");
  assertExactFields(state, ["date", "controlsBySlug", "appliedCrons"], "ScheduleState");
  if (typeof state.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(state.date)) throw new Error("ScheduleState.date is invalid");
  if (!state.controlsBySlug || typeof state.controlsBySlug !== "object" || Array.isArray(state.controlsBySlug)) {
    throw new Error("ScheduleState.controlsBySlug must be a JSON object");
  }
  if (!Array.isArray(state.appliedCrons) || state.appliedCrons.some(cron => typeof cron !== "string")) {
    throw new Error("ScheduleState.appliedCrons must be an array of strings");
  }
  if (new Set(state.appliedCrons).size !== state.appliedCrons.length) throw new Error("ScheduleState.appliedCrons contains duplicates");
  for (const [slug, control] of Object.entries(state.controlsBySlug)) assertScheduleControl(slug, control);
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
  if (new Set(crons).size !== crons.length) throw new Error("crons contains duplicates");
  state.appliedCrons = [...crons];
  return state;
}

export function areCronsApplied(state, crons) {
  return JSON.stringify(state.appliedCrons) === JSON.stringify(crons);
}

export function isNowInCronWindow(control, nowUtc) {
  assertScheduleControl("scope", control);
  if (control.cronWindow === null) return false;
  const hour = timePolicy.getAppHour(nowUtc);
  return hour >= control.cronWindow.startHour && hour <= control.cronWindow.endHour;
}
