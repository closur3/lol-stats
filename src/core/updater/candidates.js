export function selectFetchCandidates(tournaments, forceSlugs = null) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const candidates = [];
  const hasScope = !!(forceSlugs && forceSlugs.size > 0);

  tournaments.forEach(tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");

    if (hasScope && !forceSlugs.has(slug)) {
      return;
    }

    candidates.push({
      slug,
      overviewPage: tournament.overviewPage
    });
  });

  return candidates;
}
