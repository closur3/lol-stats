import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { dataUtils } from "../../utils/dataUtils.js";
import { buildArchiveSnapshot } from "./archiveWriter.js";
import { rebuildArchiveIndexFromSnapshots } from "./archiveIndex.js";
import { loadTeamsConfig } from "./teamsConfigLoader.js";
import {
  buildActiveTournamentMap,
  readActiveTournamentMap,
  writeActiveTournamentMap
} from "./activeTournamentRegistry.js";

function findRemovedActiveTournaments(previousActive, currentActive) {
  return Object.entries(previousActive).filter(([slug]) => {
    return !Object.prototype.hasOwnProperty.call(currentActive, slug);
  });
}

async function deleteActiveRuntimeFacts(env, slug) {
  const kv = env["lol-stats-kv"];
  await Promise.all([
    kv.delete(kvKeys.home(slug)),
    kv.delete(kvKeys.log(slug)),
    kv.delete(kvKeys.rev(slug)),
    kv.delete(kvKeys.rawMatches(slug)),
    kv.delete(kvKeys.scheduleMeta(slug))
  ]);
}

async function archiveRemovedTournament(env, tournament, teamsRaw) {
  const rawMatches = await env["lol-stats-kv"].get(kvKeys.rawMatches(tournament.slug), { type: "json" });
  if (!Array.isArray(rawMatches)) {
    throw new Error(`RAW_MATCHES missing for active archive: ${tournament.slug}`);
  }
  const teamMap = dataUtils.pickTeamMap(teamsRaw, tournament, rawMatches);
  const archiveSnapshot = buildArchiveSnapshot(tournament, rawMatches, teamMap);
  await env["lol-stats-kv"].put(kvKeys.archive(tournament.slug), JSON.stringify(archiveSnapshot));
}

export async function archiveRemovedActiveTournaments(env, tournaments) {
  const currentActive = buildActiveTournamentMap(tournaments);
  const previousActive = await readActiveTournamentMap(env);
  if (previousActive == null) {
    await writeActiveTournamentMap(env, currentActive);
    return { archived: [] };
  }

  const removedEntries = findRemovedActiveTournaments(previousActive, currentActive);
  if (removedEntries.length === 0) {
    await writeActiveTournamentMap(env, currentActive);
    return { archived: [] };
  }

  const teamsRaw = await loadTeamsConfig(env);
  for (const [, tournament] of removedEntries) {
    await archiveRemovedTournament(env, tournament, teamsRaw);
  }
  await rebuildArchiveIndexFromSnapshots(env);
  for (const [slug] of removedEntries) {
    await deleteActiveRuntimeFacts(env, slug);
  }
  await writeActiveTournamentMap(env, currentActive);

  const archived = removedEntries.map(([slug]) => slug);
  console.log(`[ACTIVE:ARCHIVE] slugs=${archived.join(",")}`);
  return { archived };
}
