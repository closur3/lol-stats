export function selectFetchCandidates(tournaments, targetSlugs) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  if (!(targetSlugs instanceof Set)) throw new Error("targetSlugs must be a Set");
  const candidates = [];

  tournaments.forEach(tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");

    if (!targetSlugs.has(slug)) {
      return;
    }

    candidates.push({
      slug,
      overviewPage: tournament.overviewPage
    });
  });

  return candidates;
}
