import { FandomClient } from '../../api/fandomClient.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { dataUtils } from '../../utils/dataUtils.js';
import { Analyzer } from '../analyzer.js';
import { writeArchiveIndex, writeArchiveIndexList } from './archiveIndex.js';
import { loadTeamsConfig } from './teamsConfigLoader.js';

export function buildArchiveSnapshot(tournament, rawMatches, teamMap) {
  if (!Array.isArray(rawMatches)) throw new Error(`Archive rawMatches invalid: ${tournament.slug}`);
  const tournamentWithMap = { ...tournament, teamMap };
  const analysis = Analyzer.runFullAnalysis({ [tournament.slug]: rawMatches }, [tournamentWithMap]);
  const stats = analysis.globalStats[tournament.slug];
  const timeGrid = analysis.timeGrid[tournament.slug];
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) throw new Error(`Archive stats missing: ${tournament.slug}`);
  if (!timeGrid || typeof timeGrid !== "object" || Array.isArray(timeGrid)) throw new Error(`Archive timeGrid missing: ${tournament.slug}`);
  return {
    tournament,
    rawMatches,
    stats,
    timeGrid,
    teamMap
  };
}

async function addArchiveToList(env, slug) {
  const archiveIndex = await env["lol-stats-kv"].get(kvKeys.archiveIndex(), { type: "json" });
  const slugs = Array.isArray(archiveIndex) ? archiveIndex : [];
  if (!slugs.includes(slug)) slugs.push(slug);
  await writeArchiveIndexList(env, slugs);
  return slugs;
}

async function removeArchiveFromList(env, slug) {
  const archiveIndex = await env["lol-stats-kv"].get(kvKeys.archiveIndex(), { type: "json" });
  const slugs = Array.isArray(archiveIndex) ? archiveIndex : [];
  const filtered = slugs.filter(s => s !== slug);
  await writeArchiveIndexList(env, filtered);
  return filtered;
}

async function rebuildConfigArchiveFromIndex(env) {
  const archiveIndex = await env["lol-stats-kv"].get(kvKeys.archiveIndex(), { type: "json" });
  const slugs = Array.isArray(archiveIndex) ? archiveIndex : [];
  const snapshots = await Promise.all(slugs.map(slug => env["lol-stats-kv"].get(kvKeys.archive(slug), { type: "json" })));
  const tournaments = snapshots.map((snapshot, index) => {
    if (!snapshot?.tournament) throw new Error(`Invalid archive snapshot: ${slugs[index]}`);
    return snapshot.tournament;
  });
  await writeArchiveIndex(env, tournaments, { allowEmpty: true });
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
  const teamsRaw = await loadTeamsConfig(env);
  const matches = await fandomClient.fetchAllMatches(payload.slug, payload.overviewPages, null);
  if (!matches || matches.length === 0) throw new Error("No matches found from Fandom API");

  const tournament = buildTournamentFromArchivePayload(payload);
  const teamMap = dataUtils.pickTeamMap(teamsRaw, tournament, matches);
  await env["lol-stats-kv"].put(kvKeys.archive(payload.slug), JSON.stringify(buildArchiveSnapshot(tournament, matches, teamMap)));
  await addArchiveToList(env, payload.slug);
  await rebuildConfigArchiveFromIndex(env);
}

export async function deleteArchiveSnapshot(env, slug) {
  const existing = await env["lol-stats-kv"].get(kvKeys.archive(slug), { type: "json" });
  if (!existing) throw new Error(`ARCHIVE snapshot missing: ${slug}`);
  await env["lol-stats-kv"].delete(kvKeys.archive(slug));
  await removeArchiveFromList(env, slug);
  await rebuildConfigArchiveFromIndex(env);
}

export async function writeManualArchive(env, payload) {
  const snapshot = {
    tournament: buildTournamentFromArchivePayload(payload),
    rawMatches: [],
    stats: {},
    timeGrid: {},
    teamMap: {}
  };

  await env["lol-stats-kv"].put(kvKeys.archive(payload.slug), JSON.stringify(snapshot));
  await addArchiveToList(env, payload.slug);
  await rebuildConfigArchiveFromIndex(env);
}
