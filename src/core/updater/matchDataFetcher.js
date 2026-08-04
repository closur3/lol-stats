import { assertRawMatches } from "../facts/rawMatchesStore.js";

export async function fetchRawMatchesForCandidates(fandomClient, candidates) {
  if (!Array.isArray(candidates)) throw new Error("candidates must be an array");
  const fetchSettlements = await Promise.allSettled(
    candidates.map(async (candidate) => {
      if (!candidate || typeof candidate !== "object" || !candidate.tournamentName) {
        throw new Error("Invalid fetch candidate");
      }
      const fetchedMatches = await fandomClient.fetchAllMatches(candidate.tournamentName, candidate.overviewPage);
      return { tournamentName: candidate.tournamentName, rawMatches: fetchedMatches };
    })
  );

  return fetchSettlements.map((fetchSettlement, index) => {
    const tournamentName = candidates[index].tournamentName;
    if (fetchSettlement.status === 'fulfilled') {
      assertRawMatches(tournamentName, fetchSettlement.value.rawMatches);
      return { status: 'fulfilled', tournamentName, rawMatches: fetchSettlement.value.rawMatches };
    } else {
      return { status: 'rejected', tournamentName, error: fetchSettlement.reason };
    }
  });
}
