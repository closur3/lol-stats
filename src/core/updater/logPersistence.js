import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { updateConfig } from "./updateConfig.js";

async function readExistingLogEntries(kv, logKey) {
  const logs = await kv.get(logKey, { type: "json" });
  if (logs == null) return [];
  if (!Array.isArray(logs)) throw new Error(`ActiveLog must be an array: ${logKey}`);
  return logs;
}

export async function appendActiveLogs(env, activeLogEntries) {
  if (!activeLogEntries || typeof activeLogEntries !== "object" || Array.isArray(activeLogEntries)) {
    throw new Error("activeLogEntries must be a JSON object");
  }
  const kv = env["lol-stats-kv"];
  await Promise.all(Object.entries(activeLogEntries).map(async ([slug, entry]) => {
    if (!slug) throw new Error("ActiveLog slug missing");
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`ActiveLog entry must be a JSON object: ${slug}`);
    }
    const logKey = kvKeys.log(slug);
    const oldLogs = await readExistingLogEntries(kv, logKey);
    const nextLogs = [entry, ...oldLogs].slice(0, updateConfig.maxLogEntries);
    await env["lol-stats-kv"].put(logKey, JSON.stringify(nextLogs));
  }));
}
