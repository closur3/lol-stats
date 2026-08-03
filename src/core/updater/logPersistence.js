import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { updateConfig } from "./updateConfig.js";
import { normalizeActiveLogEntries, normalizeActiveLogEntry } from "../facts/activeLog.js";

async function readExistingLogEntries(kv, logKey) {
  const logs = await kv.get(logKey, { type: "json" });
  if (logs == null) return [];
  return normalizeActiveLogEntries(logs, logKey);
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
    const nextLogs = [normalizedEntry, ...oldLogs].slice(0, updateConfig.maxLogEntries);
    await env["lol-stats-kv"].put(logKey, JSON.stringify(nextLogs));
  }));
}

export async function replaceActiveLogs(env, activeLogEntries) {
  if (!activeLogEntries || typeof activeLogEntries !== "object" || Array.isArray(activeLogEntries)) {
    throw new Error("activeLogEntries must be a JSON object");
  }
  const kv = env["lol-stats-kv"];
  await Promise.all(Object.entries(activeLogEntries).map(async ([slug, entry]) => {
    if (!slug) throw new Error("ActiveLog slug missing");
    const normalizedEntry = normalizeActiveLogEntry(entry, `ActiveLog_${slug} entry`);
    await kv.put(kvKeys.log(slug), JSON.stringify([normalizedEntry]));
  }));
}

export async function commitActiveLogWrites(env, writes) {
  if (!writes || typeof writes !== "object" || Array.isArray(writes)) {
    throw new Error("ActiveLog writes must be a JSON object");
  }
  const fields = Object.keys(writes);
  const expectedFields = ["appendEntries", "replaceEntries"];
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(writes, field))) {
    throw new Error("ActiveLog writes fields must be appendEntries and replaceEntries");
  }
  for (const field of expectedFields) {
    if (!writes[field] || typeof writes[field] !== "object" || Array.isArray(writes[field])) {
      throw new Error(`ActiveLog writes.${field} must be a JSON object`);
    }
  }
  const appendSlugs = new Set(Object.keys(writes.appendEntries));
  const overlappingSlug = Object.keys(writes.replaceEntries).find(slug => appendSlugs.has(slug));
  if (overlappingSlug) throw new Error(`ActiveLog write mode conflict: ${overlappingSlug}`);
  await Promise.all([
    appendActiveLogs(env, writes.appendEntries),
    replaceActiveLogs(env, writes.replaceEntries)
  ]);
}
