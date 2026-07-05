import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

function normalizeTeamsConfig(teams) {
  if (!teams || typeof teams !== "object" || Array.isArray(teams)) {
    throw new Error("CONFIG_TEAMS must be object");
  }
  return teams;
}

export async function readTeamsConfig(env) {
  const kv = env["lol-stats-kv"];
  const storedConfig = await kv.get(kvKeys.configTeams(), { type: "json" });
  if (storedConfig == null) throw new Error("CONFIG_TEAMS missing");
  return normalizeTeamsConfig(storedConfig);
}
