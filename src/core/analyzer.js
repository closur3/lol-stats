import { buildTeamNameResolver } from './analysis/teamResolver.js';
import { parseTournamentMatches } from './analysis/matchParser.js';
import { buildTournamentTimeGrid } from './analysis/gridBuilder.js';

export function analyzeTournaments(rawMatchesBySlug, tournaments) {
    if (!Array.isArray(tournaments)) {
      throw new Error("tournaments must be an array");
    }
    const globalStats = {};
    const timeGrid = {};

    tournaments.forEach(tournament => {
      const rawMatches = rawMatchesBySlug[tournament.slug];
      if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in analyzer input: ${tournament.slug}`);

      const resolveTeamName = buildTeamNameResolver(tournament.teamMap);
      const { stats, timeGridLayoutMatches, timeGridMatches } = parseTournamentMatches(rawMatches, resolveTeamName, tournament.slug);

      globalStats[tournament.slug] = stats;

      buildTournamentTimeGrid(tournament.slug, timeGridLayoutMatches, timeGridMatches, timeGrid);
    });

    return {
      globalStats,
      timeGrid
    };
}
