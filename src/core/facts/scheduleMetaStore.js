import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { computeScheduleMetaFromRawMatches } from "../analysis/scheduleMeta.js";
import { createScheduleSessionKey } from "../scheduleIdentity.js";
import { readRawMatches } from "./rawMatchesStore.js";

function readPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
  return value;
}

function readText(value, label, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function readDateKeys(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const dates = value.map((date, index) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`${label}[${index}] must be an app date key`);
    }
    return date;
  });
  if (new Set(dates).size !== dates.length) throw new Error(`${label} contains duplicates`);
  if (JSON.stringify(dates) !== JSON.stringify([...dates].sort())) throw new Error(`${label} must be sorted`);
  return dates;
}

function normalizeSession(session, label) {
  if (!session || typeof session !== "object" || Array.isArray(session)) {
    throw new Error(`${label} must be a JSON object`);
  }
  const normalized = {
    overviewPage: readText(session.overviewPage, `${label}.overviewPage`),
    tab: readText(session.tab, `${label}.tab`, true),
    matchDay: readPositiveInteger(session.matchDay, `${label}.matchDay`),
    firstMatchNumber: readPositiveInteger(session.firstMatchNumber, `${label}.firstMatchNumber`),
    lastMatchNumber: readPositiveInteger(session.lastMatchNumber, `${label}.lastMatchNumber`),
    startTimestamp: readPositiveInteger(session.startTimestamp, `${label}.startTimestamp`),
    lastMatchTimestamp: readPositiveInteger(session.lastMatchTimestamp, `${label}.lastMatchTimestamp`),
    matchCount: readPositiveInteger(session.matchCount, `${label}.matchCount`),
    unfinishedCount: Number(session.unfinishedCount),
    matchDates: readDateKeys(session.matchDates, `${label}.matchDates`),
    unfinishedDates: readDateKeys(session.unfinishedDates, `${label}.unfinishedDates`)
  };
  if (!Number.isInteger(normalized.unfinishedCount) || normalized.unfinishedCount < 0 || normalized.unfinishedCount > normalized.matchCount) {
    throw new Error(`${label}.unfinishedCount is out of range`);
  }
  if (normalized.firstMatchNumber > normalized.lastMatchNumber) throw new Error(`${label} match number range is invalid`);
  if (normalized.startTimestamp > normalized.lastMatchTimestamp) throw new Error(`${label} timestamp range is invalid`);
  if (normalized.unfinishedCount === 0 && normalized.unfinishedDates.length !== 0) {
    throw new Error(`${label}.unfinishedDates must be empty when the session is complete`);
  }
  if (normalized.unfinishedCount > 0 && normalized.unfinishedDates.length === 0) {
    throw new Error(`${label}.unfinishedDates missing for unfinished matches`);
  }
  for (const date of normalized.unfinishedDates) {
    if (!normalized.matchDates.includes(date)) throw new Error(`${label}.unfinishedDates contains an unknown date`);
  }
  return normalized;
}

export function assertScheduleMetaFields(label, meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error(`${label} must be a JSON object`);
  }
  if (!Array.isArray(meta.sessions)) throw new Error(`${label}.sessions must be an array`);
  const sessions = meta.sessions.map((session, index) => normalizeSession(session, `${label}.sessions[${index}]`));
  const keys = new Set();
  let previousTimestamp = -1;
  for (const session of sessions) {
    const key = createScheduleSessionKey(session.overviewPage, session.tab, session.matchDay);
    if (keys.has(key)) throw new Error(`${label}.sessions contains duplicate session ${key}`);
    keys.add(key);
    if (session.startTimestamp < previousTimestamp) throw new Error(`${label}.sessions must be sorted`);
    previousTimestamp = session.startTimestamp;
  }
  return { sessions };
}

function normalizeScheduleMeta(slug, meta) {
  if (!slug) throw new Error("schedule meta slug missing");
  return { slug, ...assertScheduleMetaFields(`ScheduleMeta.${slug}`, meta) };
}

export async function rebuildScheduleMetaFromRawMatches(env, slug) {
  if (!slug) throw new Error("schedule meta slug missing");
  const rawMatches = await readRawMatches(env, slug);
  return writeScheduleMeta(env, slug, computeScheduleMetaFromRawMatches(rawMatches));
}

export async function readScheduleMeta(env, slug) {
  if (!slug) throw new Error("schedule meta slug missing");
  const meta = await env["lol-stats-kv"].get(kvKeys.scheduleMeta(slug), { type: "json" });
  if (meta == null) throw new Error(`ScheduleMeta missing: ${slug}`);
  return normalizeScheduleMeta(slug, meta);
}

export async function ensureScheduleMeta(env, slug) {
  if (!slug) throw new Error("schedule meta slug missing");
  const meta = await env["lol-stats-kv"].get(kvKeys.scheduleMeta(slug), { type: "json" });
  if (meta == null) return rebuildScheduleMetaFromRawMatches(env, slug);
  return normalizeScheduleMeta(slug, meta);
}

export async function writeScheduleMeta(env, slug, meta) {
  const normalized = normalizeScheduleMeta(slug, meta);
  await env["lol-stats-kv"].put(kvKeys.scheduleMeta(slug), JSON.stringify(normalized));
  return normalized;
}
