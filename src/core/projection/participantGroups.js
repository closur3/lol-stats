import { buildTeamNameResolver } from "../analysis/teamResolver.js";

export function buildParticipantGroups(tournament, overviewPage, stats) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) throw new Error("tournament must be an object");
  if (!Array.isArray(tournament.participantGroups)) throw new Error(`${tournament.name} participantGroups must be an array`);
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) throw new Error(`${tournament.name} page stats must be an object`);
  const resolveTeamName = buildTeamNameResolver(tournament.teamMap);
  const memberships = new Set();
  const groups = tournament.participantGroups
    .filter(group => group.overviewPage === overviewPage)
    .map(group => {
      const teams = group.teams.map(rawTeamName => {
        const teamName = resolveTeamName(rawTeamName);
        if (memberships.has(teamName)) {
          throw new Error(`${tournament.name} duplicate resolved group membership: ${overviewPage}:${teamName}`);
        }
        memberships.add(teamName);
        return teamName;
      });
      return { groupDisplay: group.groupDisplay, teams };
    });

  if (groups.length > 0) {
    const ungroupedTeams = Object.keys(stats)
      .filter(teamName => teamName !== "TBD" && !memberships.has(teamName))
      .sort();
    if (ungroupedTeams.length > 0) {
      throw new Error(`${tournament.name} stats teams missing native group: ${overviewPage}:${ungroupedTeams.join(",")}`);
    }
  }
  return groups;
}
