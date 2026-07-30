import { parseTournamentMatches } from "./matchParser.js";

function collectMatchesByOverviewPage(rawMatches, tournament) {
  const matchesByPage = new Map(tournament.overviewPage.map(page => [page, []]));
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
  if (!Array.isArray(tournament.overviewPage) || tournament.overviewPage.length === 0) {
    throw new Error(`${tournament.slug} overviewPage must be a non-empty array`);
  }
  if (!Array.isArray(tournament.participantGroups)) {
    throw new Error(`${tournament.slug} participantGroups must be an array`);
  }

  const matchesByPage = collectMatchesByOverviewPage(rawMatches, tournament);
  const combinedAnalysis = parseTournamentMatches(rawMatches, resolveTeamName, tournament.slug);
  const pages = tournament.overviewPage.map(overviewPage => {
    const pageMatches = matchesByPage.get(overviewPage);
    const stats = tournament.overviewPage.length === 1
      ? combinedAnalysis.stats
      : parseTournamentMatches(pageMatches, resolveTeamName, `${tournament.slug}:${overviewPage}`).stats;
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
    timeGridLayoutMatches: combinedAnalysis.timeGridLayoutMatches,
    timeGridMatches: combinedAnalysis.timeGridMatches
  };
}
