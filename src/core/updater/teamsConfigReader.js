import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

function normalizeTeamsConfig(teams) {
  if (!teams || typeof teams !== "object" || Array.isArray(teams)) {
    throw new Error("ConfigTeams must be object");
  }
  return teams;
}

export async function readTeamsConfig(env) {
  const kv = env["lol-stats-kv"];
  const storedConfig = await kv.get(kvKeys.configTeams(), { type: "json" });
  if (storedConfig == null) throw new Error("ConfigTeams missing");
  return normalizeTeamsConfig(storedConfig);
}
