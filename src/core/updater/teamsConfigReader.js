import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertTeamAliasMap } from "../../utils/data/teamMaps.js";

export async function readTeamsConfig(env) {
  const kv = env["lol-stats-kv"];
  const storedConfig = await kv.get(kvKeys.configTeams(), { type: "json" });
  if (storedConfig == null) throw new Error("ConfigTeams missing");
  return assertTeamAliasMap(storedConfig);
}
