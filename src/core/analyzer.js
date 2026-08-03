import { buildTeamNameResolver } from './analysis/teamResolver.js';
import { buildTournamentStatistics } from './analysis/tournamentStatistics.js';
import { buildTimeGridMatches } from './analysis/gridBuilder.js';

export function analyzeTournaments(rawMatchesBySlug, tournaments) {
    if (!Array.isArray(tournaments)) {
      throw new Error("tournaments must be an array");
    }
    const statisticsBySlug = {};
    const timeDistributionBySlug = {};

    tournaments.forEach(tournament => {
      const rawMatches = rawMatchesBySlug[tournament.slug];
      if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in analyzer input: ${tournament.slug}`);

      const resolveTeamName = buildTeamNameResolver(tournament.teamMap);
      const { statistics, timeGridLayoutMatches, timeGridMatches } = buildTournamentStatistics(rawMatches, tournament, resolveTeamName);

      statisticsBySlug[tournament.slug] = statistics;

      timeDistributionBySlug[tournament.slug] = buildTimeGridMatches(timeGridLayoutMatches, timeGridMatches);
    });

    return {
      statisticsBySlug,
      timeDistributionBySlug
    };
}
