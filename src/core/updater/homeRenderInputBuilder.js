import { dateUtils } from '../../utils/dateUtils.js';
import { timePolicy } from '../../utils/timePolicy.js';
import { rebuildMissingScheduleMetaFromRawMatches } from '../facts/scheduleMetaStore.js';
import { updateConfig } from './updateConfig.js';

export async function restoreMissingScheduleMetaBySlugFromRawMatches(env, orderedTournaments) {
  const scheduleMetas = await Promise.all(orderedTournaments.map(async (tournament) => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    return rebuildMissingScheduleMetaFromRawMatches(env, slug);
  }));
  return new Map(scheduleMetas.map(meta => [meta.slug, meta]));
}

function normalizeHomeScheduleMatch(match, tournamentIndexMap) {
  if (!match || typeof match !== "object" || Array.isArray(match)) {
    throw new Error("Invalid HOME schedule match");
  }
  if (!match.slug) throw new Error("HOME schedule match slug missing");
  if (typeof match.time !== "string") throw new Error(`HOME schedule match time missing: ${match.slug}`);
  const index = tournamentIndexMap.get(match.slug);
  if (index === undefined) throw new Error(`Unknown HOME schedule match slug: ${match.slug}`);
  return {
    ...match,
    tournamentIndex: index
  };
}

function appendHomeSchedule(scheduleMap, tournamentIndexMap, home) {
  const schedule = home.scheduleMap;
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
    throw new Error(`Invalid HOME scheduleMap: ${home.tournament.slug}`);
  }
  for (const [date, matches] of Object.entries(schedule)) {
    if (!Array.isArray(matches)) throw new Error(`Invalid HOME schedule date: ${home.tournament.slug}:${date}`);
    if (!scheduleMap[date]) scheduleMap[date] = [];
    for (const match of matches) {
      scheduleMap[date].push(normalizeHomeScheduleMatch(match, tournamentIndexMap));
    }
  }
}

export function buildHomeRenderInput(homeEntries, orderedTournaments, scheduleMetaMap) {
  if (!Array.isArray(homeEntries)) throw new Error("homeEntries must be an array");
  if (!Array.isArray(orderedTournaments)) throw new Error("orderedTournaments must be an array");
  if (!(scheduleMetaMap instanceof Map)) throw new Error("scheduleMetaMap must be a Map");
  const tournamentIndexMap = new Map(orderedTournaments.map((tournament, index) => [tournament.slug, index]));
  const globalStats = {};
  const timeGrid = {};
  const scheduleMap = {};
  const scheduleMetaBySlug = {};

  for (const home of homeEntries) {
    const slug = home.tournament.slug;
    globalStats[slug] = home.stats;
    timeGrid[slug] = home.timeGrid;
    const meta = scheduleMetaMap.get(slug);
    if (!meta) throw new Error(`ScheduleMeta missing after load: ${slug}`);
    scheduleMetaBySlug[slug] = meta;

    appendHomeSchedule(scheduleMap, tournamentIndexMap, home);
  }

  for (const date of Object.keys(scheduleMap)) {
    scheduleMap[date].sort((leftMatch, rightMatch) => {
      const leftTournamentIndex = leftMatch.tournamentIndex;
      const rightTournamentIndex = rightMatch.tournamentIndex;
      if (leftTournamentIndex !== rightTournamentIndex) return leftTournamentIndex - rightTournamentIndex;
      return leftMatch.time.localeCompare(rightMatch.time);
    });
  }

  return { tournaments: orderedTournaments, globalStats, timeGrid, scheduleMap, scheduleMetaBySlug };
}

export function pruneHomeSchedule(scheduleMap, scheduleMetaBySlug) {
  const historyUnfinished = {};
  for (const [slug, meta] of Object.entries(scheduleMetaBySlug)) {
    if (meta.hasHistoryUnfinished) historyUnfinished[slug] = true;
  }

  return dateUtils.pruneScheduleMapByDayStatus(
    scheduleMap,
    updateConfig.maxScheduleDays,
    timePolicy.getCurrentAppDateTime().dateString,
    historyUnfinished
  );
}
