import { timeGridColumnCount, defaultMaxScheduleDays } from '../constants/index.js';
import { timePolicy } from '../utils/timePolicy.js';
import { buildResolveName } from './analysis/teamResolver.js';
import { parseAllMatches } from './analysis/matchParser.js';
import { buildTimeGridAndSchedule } from './analysis/gridBuilder.js';
import { buildScheduleMap } from './analysis/futureMatchBuilder.js';

export function runFullAnalysis(allRawMatches, tournaments, maxScheduleDays = defaultMaxScheduleDays) {
    if (!Array.isArray(tournaments)) {
      throw new Error("tournaments must be an array");
    }
    const globalStats = {};
    const scheduleMetaBySlug = {};

    const timeGrid = { "ALL": {} };
    const createSlot = () => {
      const slot = {};
      for (let dayIndex = 0; dayIndex < timeGridColumnCount; dayIndex++) {
        slot[dayIndex] = { totalMatchCount: 0, fullLengthMatchCount: 0, matches: [] };
      }
      return slot;
    };
    timeGrid.ALL = createSlot();

    const todayStr = timePolicy.getCurrentAppDateTime().dateString;
    const allFutureMatches = {};

    tournaments.forEach((tournament, tournamentIndex) => {
      const rawMatches = allRawMatches[tournament.slug];
      if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in analyzer input: ${tournament.slug}`);

      const resolveName = buildResolveName(tournament.teamMap);
      const { stats, parsedMatches, scheduleMeta } = parseAllMatches(rawMatches, resolveName, todayStr, tournament.slug, tournament.leagueShort, tournamentIndex, allFutureMatches);

      globalStats[tournament.slug] = stats;

      buildTimeGridAndSchedule(tournament.slug, parsedMatches, timeGrid);

      scheduleMetaBySlug[tournament.slug] = scheduleMeta;
    });

    const scheduleMap = buildScheduleMap(allFutureMatches, maxScheduleDays, scheduleMetaBySlug);

    return {
      globalStats,
      timeGrid,
      scheduleMap,
      scheduleMetaBySlug
    };
}
