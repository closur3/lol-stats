import { dataUtils } from '../../utils/dataUtils.js';

export async function prepareTournamentContext(env, tournaments, cache, teamsRaw) {
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }
  for (const tournament of tournaments) {
    const rawMatches = cache.rawMatches[tournament.slug];
    if (!Array.isArray(rawMatches)) throw new Error(`RAW_MATCHES missing in context: ${tournament.slug}`);
    tournament.teamMap = dataUtils.pickTeamMap(teamsRaw, tournament, rawMatches);
  }
}
