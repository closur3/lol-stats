import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

export async function loadTeamsConfig(env, githubClient) {
  const kv = env["lol-stats-kv"];
  const cached = await kv.get(kvKeys.configTeams(), { type: "json" });
  if (cached && typeof cached === "object" && !Array.isArray(cached)) return cached;

  const teams = await githubClient.fetchJson("config/teams.json");
  if (!teams || typeof teams !== "object" || Array.isArray(teams)) {
    throw new Error("config/teams.json must be object");
  }
  await kv.put(kvKeys.configTeams(), JSON.stringify(teams));
  return teams;
}

