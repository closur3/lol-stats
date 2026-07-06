import { FandomClient } from "../../api/fandomClient.js";
import { login } from "../../api/fandom/auth.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { pickTeamMap } from "../../utils/data/teamMaps.js";
import { buildArchiveSnapshot } from "./archiveSnapshotBuilder.js";
import { readTeamsConfig } from "./teamsConfigReader.js";

export async function rebuildArchiveSnapshot(env, tournament) {
  const authContext = await login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
  const fandomClient = new FandomClient(authContext);
  const teamsRaw = await readTeamsConfig(env);
  const matches = await fandomClient.fetchAllMatches(tournament.slug, tournament.overview_page, null);
  if (!matches || matches.length === 0) throw new Error("No matches found from Fandom API");

  const teamMap = pickTeamMap(teamsRaw, matches);
  await env["lol-stats-kv"].put(kvKeys.archive(tournament.slug), JSON.stringify(buildArchiveSnapshot(tournament, matches, teamMap)));
}
