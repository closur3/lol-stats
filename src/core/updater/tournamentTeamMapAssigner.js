import { dataUtils } from '../../utils/dataUtils.js';

export async function assignTournamentTeamMaps(tournaments, workingSet, teamsRaw) {
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }
  for (const tournament of tournaments) {
    const rawMatches = workingSet.rawMatches[tournament.slug];
    if (!Array.isArray(rawMatches)) throw new Error(`RAW_MATCHES missing for team map assignment: ${tournament.slug}`);
    tournament.teamMap = dataUtils.pickTeamMap(teamsRaw, tournament, rawMatches);
  }
}
