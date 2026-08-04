import { getOverviewPageNames } from "../../utils/data/overviewPages.js";

export function selectFetchCandidates(tournaments, targetNames) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  if (!(targetNames instanceof Set)) throw new Error("targetNames must be a Set");
  const candidates = [];

  tournaments.forEach(tournament => {
    const tournamentName = tournament?.name;
    if (!tournamentName) throw new Error("Tournament tournamentName missing");

    if (!targetNames.has(tournamentName)) {
      return;
    }

    candidates.push({
      tournamentName,
      overviewPage: getOverviewPageNames(tournament.overviewPages)
    });
  });

  return candidates;
}
