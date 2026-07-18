import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { timePolicy } from "../../utils/timePolicy.js";
import { parseScheduleSessionKey } from "../scheduleIdentity.js";

function assertExactFields(value, expectedFields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  const fields = Object.keys(value);
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(value, field))) {
    throw new Error(`${label} fields must be ${expectedFields.join(" and ")}`);
  }
}

function readPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
  return value;
}

function normalizeEntry(entry, label) {
  assertExactFields(entry, ["sessionKey", "observedAt", "expiresAt"], label);
  if (typeof entry.sessionKey !== "string" || entry.sessionKey.trim() === "") {
    throw new Error(`${label}.sessionKey must be a string`);
  }
  parseScheduleSessionKey(entry.sessionKey, `${label}.sessionKey`);
  const normalized = {
    sessionKey: entry.sessionKey,
    observedAt: readPositiveInteger(entry.observedAt, `${label}.observedAt`),
    expiresAt: readPositiveInteger(entry.expiresAt, `${label}.expiresAt`)
  };
  if (normalized.observedAt >= normalized.expiresAt) {
    throw new Error(`${label}.observedAt must be before expiresAt`);
  }
  if (normalized.expiresAt !== timePolicy.getNextAppDateStartTimestamp(normalized.observedAt)) {
    throw new Error(`${label}.expiresAt must be the next app midnight after observedAt`);
  }
  return normalized;
}

export function assertScheduleCarryoverFields(label, value) {
  assertExactFields(value, ["entries"], label);
  if (!Array.isArray(value.entries)) throw new Error(`${label}.entries must be an array`);

  const entries = value.entries.map((entry, index) => normalizeEntry(entry, `${label}.entries[${index}]`));
  const sessionKeys = entries.map(entry => entry.sessionKey);
  if (new Set(sessionKeys).size !== sessionKeys.length) {
    throw new Error(`${label}.entries contains duplicate sessionKey`);
  }
  if (JSON.stringify(sessionKeys) !== JSON.stringify([...sessionKeys].sort())) {
    throw new Error(`${label}.entries must be sorted by sessionKey`);
  }
  return { entries };
}

function readSlug(slug) {
  if (typeof slug !== "string" || slug.trim() === "") throw new Error("schedule carryover slug missing");
  return slug;
}

function normalizeScheduleCarryover(slug, value) {
  const normalizedSlug = readSlug(slug);
  return {
    slug: normalizedSlug,
    ...assertScheduleCarryoverFields(`ScheduleCarryover.${normalizedSlug}`, value)
  };
}

export async function readScheduleCarryover(env, slug) {
  const normalizedSlug = readSlug(slug);
  const value = await env["lol-stats-kv"].get(kvKeys.scheduleCarryover(normalizedSlug), { type: "json" });
  if (value == null) throw new Error(`ScheduleCarryover missing: ${normalizedSlug}`);
  return normalizeScheduleCarryover(normalizedSlug, value);
}

export async function readExistingScheduleCarryover(env, slug) {
  const normalizedSlug = readSlug(slug);
  const value = await env["lol-stats-kv"].get(kvKeys.scheduleCarryover(normalizedSlug), { type: "json" });
  if (value == null) return null;
  return normalizeScheduleCarryover(normalizedSlug, value);
}

export async function writeScheduleCarryover(env, slug, value) {
  const normalizedSlug = readSlug(slug);
  const fields = assertScheduleCarryoverFields(`ScheduleCarryover.${normalizedSlug}`, value);
  await env["lol-stats-kv"].put(kvKeys.scheduleCarryover(normalizedSlug), JSON.stringify(fields));
  return { slug: normalizedSlug, ...fields };
}
