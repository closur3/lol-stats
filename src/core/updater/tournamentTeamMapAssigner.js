import { pickTeamMap } from '../../utils/data/teamMaps.js';

export function assignTournamentTeamMaps(tournaments, rawMatchesBySlug, teamsRaw) {
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }
  for (const tournament of tournaments) {
    const rawMatches = rawMatchesBySlug[tournament.slug];
    if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing for team map assignment: ${tournament.slug}`);
    tournament.teamMap = pickTeamMap(teamsRaw, rawMatches);
  }
}
