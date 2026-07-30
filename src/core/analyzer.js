import { buildTeamNameResolver } from './analysis/teamResolver.js';
import { buildTournamentStatistics } from './analysis/tournamentStatistics.js';
import { buildTournamentTimeGrid } from './analysis/gridBuilder.js';

export function analyzeTournaments(rawMatchesBySlug, tournaments) {
    if (!Array.isArray(tournaments)) {
      throw new Error("tournaments must be an array");
    }
    const statisticsBySlug = {};
    const timeGrid = {};

    tournaments.forEach(tournament => {
      const rawMatches = rawMatchesBySlug[tournament.slug];
      if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in analyzer input: ${tournament.slug}`);

      const resolveTeamName = buildTeamNameResolver(tournament.teamMap);
      const {
        statistics,
        timeGridLayoutMatches,
        timeGridMatches
      } = buildTournamentStatistics(rawMatches, tournament, resolveTeamName);

      statisticsBySlug[tournament.slug] = statistics;

      buildTournamentTimeGrid(tournament.slug, timeGridLayoutMatches, timeGridMatches, timeGrid);
    });

    return {
      statisticsBySlug,
      timeGrid
    };
}
