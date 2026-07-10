export async function fetchRawMatchesForCandidates(fandomClient, candidates) {
  if (!Array.isArray(candidates)) throw new Error("candidates must be an array");
  const fetchSettlements = await Promise.allSettled(
    candidates.map(async (candidate) => {
      if (!candidate || typeof candidate !== "object" || !candidate.slug) {
        throw new Error("Invalid fetch candidate");
      }
      const fetchedMatches = await fandomClient.fetchAllMatches(candidate.slug, candidate.overviewPage);
      return { slug: candidate.slug, rawMatches: fetchedMatches };
    })
  );

  return fetchSettlements.map((fetchSettlement, index) => {
    const slug = candidates[index].slug;
    if (fetchSettlement.status === 'fulfilled') {
      if (!Array.isArray(fetchSettlement.value.rawMatches)) throw new Error(`Fetched RawMatches must be an array: ${slug}`);
      return { status: 'fulfilled', slug, rawMatches: fetchSettlement.value.rawMatches };
    } else {
      return { status: 'rejected', slug, error: fetchSettlement.reason };
    }
  });
}
