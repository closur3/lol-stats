import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { timePolicy } from "../../utils/timePolicy.js";
import { parseScheduleSessionKey } from "../scheduleIdentity.js";

export class ScheduleStateSchemaError extends Error {
  constructor(cause) {
    super(`ScheduleState schema invalid: ${cause.message}`, { cause });
    this.name = "ScheduleStateSchemaError";
  }
}

function assertExactFields(value, fields, label) {
  const actual = Object.keys(value);
  if (actual.length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) {
    throw new Error(`${label} fields must match the schema`);
  }
}

function assertCronWindow(tournamentName, window) {
  if (window === null) return;
  if (!window || typeof window !== "object" || Array.isArray(window)) {
    throw new Error(`ScheduleState.controlsByName.${tournamentName}.cronWindow must be a JSON object or null`);
  }
  assertExactFields(window, ["startHour", "endHour"], `ScheduleState.controlsByName.${tournamentName}.cronWindow`);
  const { startHour, endHour } = window;
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 23 || startHour > endHour) {
    throw new Error(`ScheduleState.controlsByName.${tournamentName}.cronWindow is invalid`);
  }
}

function assertTrackedSessionKeys(tournamentName, sessionKeys) {
  if (!Array.isArray(sessionKeys)) {
    throw new Error(`ScheduleState.controlsByName.${tournamentName}.trackedSessionKeys must be an array`);
  }
  const keys = new Set();
  for (const [index, sessionKey] of sessionKeys.entries()) {
    const label = `ScheduleState.controlsByName.${tournamentName}.trackedSessionKeys[${index}]`;
    parseScheduleSessionKey(sessionKey, label);
    if (keys.has(sessionKey)) throw new Error(`${label} is duplicated`);
    keys.add(sessionKey);
  }
}

export function assertScheduleControl(tournamentName, control) {
  if (!control || typeof control !== "object" || Array.isArray(control)) {
    throw new Error(`ScheduleState.controlsByName.${tournamentName} must be a JSON object`);
  }
  assertExactFields(control, ["cronWindow", "trackedSessionKeys"], `ScheduleState.controlsByName.${tournamentName}`);
  assertCronWindow(tournamentName, control.cronWindow);
  assertTrackedSessionKeys(tournamentName, control.trackedSessionKeys);
  return control;
}

function normalizeScheduleState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("ScheduleState must be a JSON object");
  assertExactFields(state, ["date", "controlsByName", "appliedCrons"], "ScheduleState");
  if (typeof state.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(state.date)) throw new Error("ScheduleState.date is invalid");
  if (!state.controlsByName || typeof state.controlsByName !== "object" || Array.isArray(state.controlsByName)) {
    throw new Error("ScheduleState.controlsByName must be a JSON object");
  }
  if (!Array.isArray(state.appliedCrons) || state.appliedCrons.some(cron => typeof cron !== "string")) {
    throw new Error("ScheduleState.appliedCrons must be an array of strings");
  }
  if (new Set(state.appliedCrons).size !== state.appliedCrons.length) throw new Error("ScheduleState.appliedCrons contains duplicates");
  for (const [tournamentName, control] of Object.entries(state.controlsByName)) assertScheduleControl(tournamentName, control);
  return state;
}

export async function readScheduleState(env) {
  const stored = await env["lol-stats-kv"].get(kvKeys.scheduleState());
  if (stored == null) return null;
  try {
    const state = typeof stored === "string" ? JSON.parse(stored) : stored;
    return normalizeScheduleState(state);
  } catch (error) {
    throw new ScheduleStateSchemaError(error);
  }
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
