import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

export async function loadTourConfig(env, githubClient) {
  const kv = env["lol-stats-kv"];
  const cached = await kv.get(kvKeys.configTour(), { type: "json" });
  if (Array.isArray(cached)) return cached;

  const tournaments = await githubClient.fetchJson("config/tour.json");
  if (!Array.isArray(tournaments)) throw new Error("config/tour.json must be array");
  await kv.put(kvKeys.configTour(), JSON.stringify(tournaments));
  return tournaments;
}
