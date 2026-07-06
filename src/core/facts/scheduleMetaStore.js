import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

import { computeScheduleMetaFromRawMatches } from "../analysis/scheduleMeta.js";
import { readRawMatches } from "./rawMatchesStore.js";

function readNonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return number;
}

export function assertScheduleMetaFields(label, meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return {
    todayEarliestTimestamp: readNonNegativeInteger(meta.todayEarliestTimestamp, `${label}.todayEarliestTimestamp`),
    todayUnfinished: readNonNegativeInteger(meta.todayUnfinished, `${label}.todayUnfinished`),
    hasHistoryUnfinished: meta.hasHistoryUnfinished === true
  };
}

function normalizeScheduleMeta(slug, meta) {
  if (!slug) throw new Error("schedule meta slug missing");
  const fields = assertScheduleMetaFields(`ScheduleMeta.${slug}`, meta);
  return {
    slug,
    ...fields
  };
}

export async function rebuildScheduleMetaFromRawMatches(env, slug) {
  if (!slug) throw new Error("schedule meta slug missing");
  const rawMatches = await readRawMatches(env, slug);
  const computedMeta = computeScheduleMetaFromRawMatches(rawMatches);
  return writeScheduleMeta(env, slug, computedMeta);
}

export async function restoreMissingScheduleMetaFromRawMatches(env, slug) {
  if (!slug) throw new Error("schedule meta slug missing");
  const meta = await env["lol-stats-kv"].get(kvKeys.scheduleMeta(slug), { type: "json" });
  if (meta == null) return rebuildScheduleMetaFromRawMatches(env, slug);
  return normalizeScheduleMeta(slug, meta);
}

export async function writeScheduleMeta(env, slug, meta) {
  const normalized = normalizeScheduleMeta(slug, meta);
  await env["lol-stats-kv"].put(kvKeys.scheduleMeta(slug), typeof normalized === "string" ? normalized : JSON.stringify(normalized));
  return normalized;
}
