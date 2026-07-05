import { FandomClient } from "../../api/fandomClient.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { dataUtils } from "../../utils/dataUtils.js";
import { rebuildArchiveIndexFromSnapshots } from "./archiveIndex.js";
import { buildArchiveSnapshot, buildArchiveTournamentFromPayload } from "./archiveSnapshotBuilder.js";
import { readTeamsConfig } from "./teamsConfigReader.js";

export async function rebuildArchiveSnapshotFromPayload(env, payload) {
  const authContext = await FandomClient.login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
  const fandomClient = new FandomClient(authContext);
  const teamsRaw = await readTeamsConfig(env);
  const matches = await fandomClient.fetchAllMatches(payload.slug, payload.overviewPages, null);
  if (!matches || matches.length === 0) throw new Error("No matches found from Fandom API");

  const tournament = buildArchiveTournamentFromPayload(payload);
  const teamMap = dataUtils.pickTeamMap(teamsRaw, tournament, matches);
  await env["lol-stats-kv"].put(kvKeys.archive(payload.slug), JSON.stringify(buildArchiveSnapshot(tournament, matches, teamMap)));
  await rebuildArchiveIndexFromSnapshots(env);
}
