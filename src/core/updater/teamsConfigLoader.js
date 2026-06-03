import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

function normalizeTeamsConfig(teams) {
  if (!teams || typeof teams !== "object" || Array.isArray(teams)) {
    throw new Error("CONFIG_TEAMS must be object");
  }
  return teams;
}

export async function loadTeamsConfig(env) {
  const kv = env["lol-stats-kv"];
  const cached = await kv.get(kvKeys.configTeams(), { type: "json" });
  if (cached == null) throw new Error("CONFIG_TEAMS missing");
  return normalizeTeamsConfig(cached);
}
