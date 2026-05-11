import { FandomClient } from '../../api/fandomClient.js';
import { GitHubClient } from '../../api/githubClient.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { dataUtils } from '../../utils/dataUtils.js';
import { kvDelete, kvPutIfChanged } from '../../utils/kvStore.js';
import { Analyzer } from '../analyzer.js';
import { generateArchiveStaticHTML } from './archiveBuilder.js';
import { rebuildArchiveIndexFromSnapshots } from './archiveIndex.js';
import { loadTeamsConfig } from './teamsConfigLoader.js';

export function buildArchiveSnapshot(tournament, rawMatches, teamMap) {
  if (!Array.isArray(rawMatches)) throw new Error(`Archive rawMatches invalid: ${tournament.slug}`);
  const tournamentWithMap = { ...tournament, teamMap };
  const miniConfig = { TOURNAMENTS: [tournamentWithMap] };
  const analysis = Analyzer.runFullAnalysis({ [tournament.slug]: rawMatches }, miniConfig);
  return {
    tournament,
    rawMatches,
    stats: analysis.globalStats[tournament.slug] || {},
    timeGrid: analysis.timeGrid[tournament.slug] || {},
    teamMap
  };
}

async function refreshArchiveDerivedState(env) {
  await rebuildArchiveIndexFromSnapshots(env);
  const archiveHTML = await generateArchiveStaticHTML(env);
  await kvPutIfChanged(env, kvKeys.archiveStatic(), archiveHTML);
}

function buildTournamentFromArchivePayload(payload) {
  return {
    slug: payload.slug,
    name: payload.name,
    overview_page: payload.overviewPages,
    league: payload.league,
    start_date: payload.startDate,
    end_date: payload.endDate
  };
}

export async function rebuildArchiveFromPayload(env, payload) {
  const authContext = await FandomClient.login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
  const fandomClient = new FandomClient(authContext);
  const githubClient = new GitHubClient(env);
  const teamsRaw = await loadTeamsConfig(env, githubClient);
  const matches = await fandomClient.fetchAllMatches(payload.slug, payload.overviewPages, null);
  if (!matches || matches.length === 0) throw new Error("No matches found from Fandom API");

  const tournament = buildTournamentFromArchivePayload(payload);
  const teamMap = dataUtils.pickTeamMap(teamsRaw, tournament, matches);
  await kvPutIfChanged(env, kvKeys.archive(payload.slug), buildArchiveSnapshot(tournament, matches, teamMap));
  await refreshArchiveDerivedState(env);
}

export async function deleteArchiveSnapshot(env, slug) {
  await kvDelete(env, kvKeys.archive(slug));
  await refreshArchiveDerivedState(env);
}

export async function writeManualArchive(env, payload) {
  const snapshot = {
    tournament: buildTournamentFromArchivePayload(payload),
    rawMatches: [],
    stats: {},
    timeGrid: {},
    teamMap: {}
  };

  await kvPutIfChanged(env, kvKeys.archive(payload.slug), snapshot);
  await refreshArchiveDerivedState(env);
}
