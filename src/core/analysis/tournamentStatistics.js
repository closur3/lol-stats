import { parseTournamentMatches } from "./matchParser.js";
import { getOverviewPageNames } from "../../utils/data/overviewPages.js";

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

function projectPageGroups(tournament, overviewPage, resolveTeamName, stats) {
  const sourceGroups = tournament.participantGroups.filter(group => group.overviewPage === overviewPage);
  const memberships = new Set();
  const groups = sourceGroups.map(group => {
    const teams = group.teams.map(rawTeamName => {
      const teamName = resolveTeamName(rawTeamName);
      if (memberships.has(teamName)) {
        throw new Error(`${tournament.slug} duplicate resolved group membership: ${overviewPage}:${teamName}`);
      }
      memberships.add(teamName);
      return teamName;
    });
    return {
      groupDisplay: group.groupDisplay,
      teams
    };
  });

  if (groups.length > 0) {
    const ungroupedTeams = Object.keys(stats)
      .filter(teamName => teamName !== "TBD" && !memberships.has(teamName))
      .sort();
    if (ungroupedTeams.length > 0) {
      throw new Error(`${tournament.slug} stats teams missing native group: ${overviewPage}:${ungroupedTeams.join(",")}`);
    }
  }
  return groups;
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
  const pages = overviewPages.map((overviewPage, index) => {
    const stats = pageAnalyses[index].stats;
    return {
      overviewPage,
      groups: projectPageGroups(tournament, overviewPage, resolveTeamName, stats),
      stats
    };
  });

  return {
    statistics: {
      combined: combinedAnalysis.stats,
      pages
    },
    pageAnalyses,
    timeGridLayoutMatches: combinedAnalysis.timeGridLayoutMatches,
    timeGridMatches: combinedAnalysis.timeGridMatches
  };
}
