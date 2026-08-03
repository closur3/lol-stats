import { parseTournamentMatches } from "./matchParser.js";
import { getOverviewPageNames } from "../../utils/data/overviewPages.js";
import { buildParticipantGroups } from "../projection/participantGroups.js";

function collectMatchesByOverviewPage(rawMatches, tournament) {
  const matchesByPage = new Map(getOverviewPageNames(tournament.overviewPages).map(page => [page, []]));
  for (const match of rawMatches) {
    if (!match || typeof match !== "object" || Array.isArray(match)) {
      throw new Error(`${tournament.slug} raw match must be an object`);
    }
    const pageMatches = matchesByPage.get(match.OverviewPage);
    if (!pageMatches) {
      throw new Error(`${tournament.slug} match outside overviewPage scope: ${String(match.OverviewPage)}`);
    }
    pageMatches.push(match);
  }
  return matchesByPage;
}

export function buildTournamentStatistics(rawMatches, tournament, resolveTeamName) {
  if (!Array.isArray(rawMatches)) throw new Error(`${tournament.slug} rawMatches must be an array`);
  const overviewPages = getOverviewPageNames(tournament.overviewPages);
  if (!Array.isArray(tournament.participantGroups)) {
    throw new Error(`${tournament.slug} participantGroups must be an array`);
  }

  const matchesByPage = collectMatchesByOverviewPage(rawMatches, tournament);
  const combinedAnalysis = parseTournamentMatches(rawMatches, resolveTeamName, tournament.slug);
  const pageAnalyses = overviewPages.map(overviewPage => {
    const pageMatches = matchesByPage.get(overviewPage);
    return overviewPages.length === 1
      ? combinedAnalysis
      : parseTournamentMatches(pageMatches, resolveTeamName, `${tournament.slug}:${overviewPage}`);
  });
  const pages = overviewPages.length === 1 ? [] : overviewPages.map((overviewPage, index) => {
    const stats = pageAnalyses[index].stats;
    buildParticipantGroups(tournament, overviewPage, stats);
    return {
      overviewPage,
      stats
    };
  });
  if (overviewPages.length === 1) buildParticipantGroups(tournament, overviewPages[0], combinedAnalysis.stats);

  return {
    statistics: {
      combined: combinedAnalysis.stats,
      pages
    },
    timeGridLayoutMatches: combinedAnalysis.timeGridLayoutMatches,
    timeGridMatches: combinedAnalysis.timeGridMatches
  };
}
