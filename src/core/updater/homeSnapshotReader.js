import { kvKeys } from '../../infrastructure/kv/keyFactory.js';

function assertHomeSnapshot(keyName, home) {
  if (!home || typeof home !== "object" || Array.isArray(home)) {
    throw new Error(`Invalid HOME snapshot: ${keyName}`);
  }
  if (!home.tournament || typeof home.tournament !== "object" || !home.tournament.slug) {
    throw new Error(`Invalid HOME tournament: ${keyName}`);
  }
  if (!home.stats || typeof home.stats !== "object" || Array.isArray(home.stats)) {
    throw new Error(`Invalid HOME stats: ${keyName}`);
  }
  if (!home.timeGrid || typeof home.timeGrid !== "object" || Array.isArray(home.timeGrid)) {
    throw new Error(`Invalid HOME timeGrid: ${keyName}`);
  }
  if (!home.scheduleMap || typeof home.scheduleMap !== "object" || Array.isArray(home.scheduleMap)) {
    throw new Error(`Invalid HOME scheduleMap: ${keyName}`);
  }
}

export async function readHomeEntries(env, slugs) {
  if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
  const kv = env["lol-stats-kv"];
  const entries = await Promise.all(slugs.map(async slug => {
    const key = kvKeys.home(slug);
    const home = await kv.get(key, { type: "json" });
    if (!home) return null;
    assertHomeSnapshot(key, home);
    return home;
  }));
  return entries.filter(Boolean);
}
