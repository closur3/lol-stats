import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { updateConfig } from "./updateConfig.js";
import { normalizeActiveLogEntries, normalizeActiveLogEntry } from "../facts/activeLog.js";

class ActiveLogDataError extends Error {}

async function readExistingLogEntries(kv, logKey) {
  const stored = await kv.get(logKey);
  if (stored == null) return [];
  let logs;
  try {
    logs = typeof stored === "string" ? JSON.parse(stored) : stored;
    return normalizeActiveLogEntries(logs, logKey);
  } catch (error) {
    throw new ActiveLogDataError(`Invalid ${logKey}`, { cause: error });
  }
}

function buildNextLogs(logEntry, oldLogs) {
  return [logEntry, ...oldLogs].slice(0, updateConfig.maxLogEntries);
}

export async function appendActiveLogs(env, activeLogEntries) {
  if (!activeLogEntries || typeof activeLogEntries !== "object" || Array.isArray(activeLogEntries)) {
    throw new Error("activeLogEntries must be a JSON object");
  }
  const kv = env["lol-stats-kv"];
  await Promise.all(Object.entries(activeLogEntries).map(async ([slug, entry]) => {
    if (!slug) throw new Error("ActiveLog slug missing");
    const normalizedEntry = normalizeActiveLogEntry(entry, `ActiveLog_${slug} entry`);
    const logKey = kvKeys.log(slug);
    const oldLogs = await readExistingLogEntries(kv, logKey);
    const nextLogs = buildNextLogs(normalizedEntry, oldLogs);
    await env["lol-stats-kv"].put(logKey, JSON.stringify(nextLogs));
  }));
}

export async function repairInvalidActiveLogs(env, activeLogEntries) {
  if (!activeLogEntries || typeof activeLogEntries !== "object" || Array.isArray(activeLogEntries)) {
    throw new Error("activeLogEntries must be a JSON object");
  }
  const kv = env["lol-stats-kv"];
  await Promise.all(Object.entries(activeLogEntries).map(async ([slug, entry]) => {
    if (!slug) throw new Error("ActiveLog slug missing");
    const normalizedEntry = normalizeActiveLogEntry(entry, `ActiveLog_${slug} entry`);
    const logKey = kvKeys.log(slug);
    try {
      const oldLogs = await readExistingLogEntries(kv, logKey);
      await kv.put(logKey, JSON.stringify(buildNextLogs(normalizedEntry, oldLogs)));
    } catch (error) {
      if (!(error instanceof ActiveLogDataError)) throw error;
      await kv.put(logKey, JSON.stringify([normalizedEntry]));
    }
  }));
}

export async function commitActiveLogWrites(env, writes) {
  if (!writes || typeof writes !== "object" || Array.isArray(writes)) {
    throw new Error("ActiveLog writes must be a JSON object");
  }
  const expectedFields = ["appendEntries", "repairEntries"];
  const fields = Object.keys(writes);
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(writes, field))) {
    throw new Error("ActiveLog writes fields must be appendEntries and repairEntries");
  }
  for (const field of expectedFields) {
    if (!writes[field] || typeof writes[field] !== "object" || Array.isArray(writes[field])) {
      throw new Error(`ActiveLog writes.${field} must be a JSON object`);
    }
  }
  const appendSlugs = new Set(Object.keys(writes.appendEntries));
  const overlappingSlug = Object.keys(writes.repairEntries).find(slug => appendSlugs.has(slug));
  if (overlappingSlug) throw new Error(`ActiveLog write mode conflict: ${overlappingSlug}`);
  await Promise.all([
    appendActiveLogs(env, writes.appendEntries),
    repairInvalidActiveLogs(env, writes.repairEntries)
  ]);
}
