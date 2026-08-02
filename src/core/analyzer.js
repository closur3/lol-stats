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
      const { statistics, pageAnalyses, timeGridLayoutMatches, timeGridMatches } = buildTournamentStatistics(rawMatches, tournament, resolveTeamName);

      statisticsBySlug[tournament.slug] = statistics;

      const tournamentTimeGrid = { combined: {}, pages: [] };
      const combinedGridContainer = {};
      buildTournamentTimeGrid(tournament.slug, timeGridLayoutMatches, timeGridMatches, combinedGridContainer);
      tournamentTimeGrid.combined = combinedGridContainer[tournament.slug];
      pageAnalyses.forEach((pageAnalysis, index) => {
        const overviewPage = tournament.overviewPage[index];
        const pageGridContainer = {};
        const pageGridKey = `${tournament.slug}:${overviewPage}`;
        buildTournamentTimeGrid(pageGridKey, pageAnalysis.timeGridLayoutMatches, pageAnalysis.timeGridMatches, pageGridContainer);
        tournamentTimeGrid.pages.push({ overviewPage, timeGrid: pageGridContainer[pageGridKey] });
      });
      timeGrid[tournament.slug] = tournamentTimeGrid;
    });

    return {
      statisticsBySlug,
      timeGrid
    };
}
