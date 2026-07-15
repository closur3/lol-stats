import { timePolicy } from '../utils/timePolicy.js';
import { buildTeamNameResolver } from './analysis/teamResolver.js';
import { parseTournamentMatches } from './analysis/matchParser.js';
import { buildTournamentTimeGrid } from './analysis/gridBuilder.js';
import { buildScheduleMap } from './analysis/futureMatchBuilder.js';
import { collectRetainedPastScheduleDates, computeScheduleMetaFromRawMatches } from './analysis/scheduleMeta.js';

export function analyzeTournaments(rawMatchesBySlug, tournaments) {
    if (!Array.isArray(tournaments)) {
      throw new Error("tournaments must be an array");
    }
    const globalStats = {};
    const scheduleMetaBySlug = {};

    const timeGrid = {};

    const todayStr = timePolicy.getCurrentAppDateTime().dateString;
    const allFutureMatches = {};

    tournaments.forEach((tournament, tournamentIndex) => {
      const rawMatches = rawMatchesBySlug[tournament.slug];
      if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in analyzer input: ${tournament.slug}`);

      const resolveTeamName = buildTeamNameResolver(tournament.teamMap);
      const scheduleMeta = computeScheduleMetaFromRawMatches(rawMatches);
      const retainedPastScheduleDates = collectRetainedPastScheduleDates(scheduleMeta, todayStr);
      const { stats, timeGridMatches } = parseTournamentMatches(rawMatches, resolveTeamName, todayStr, retainedPastScheduleDates, tournament.slug, tournament.leagueShort, tournamentIndex, allFutureMatches);

      globalStats[tournament.slug] = stats;

      buildTournamentTimeGrid(tournament.slug, timeGridMatches, timeGrid);

      scheduleMetaBySlug[tournament.slug] = scheduleMeta;
    });

    const scheduleMap = buildScheduleMap(allFutureMatches);

    return {
      globalStats,
      timeGrid,
      scheduleMap,
      scheduleMetaBySlug
    };
}
