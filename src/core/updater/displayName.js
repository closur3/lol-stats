function resolveTournamentDisplayName(tournament) {
  if (typeof tournament.leagueShort !== "string") {
    throw new Error(`Tournament leagueShort missing: ${tournament.slug}`);
  }
  return tournament.leagueShort;
}

export function buildDisplayNameMap(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  return new Map(
    tournaments.map(t => [
      t.slug, resolveTournamentDisplayName(t)
    ])
  );
}

export function getDisplayName(displayNameMap, slug) {
  if (!displayNameMap.has(slug)) throw new Error(`Tournament display name missing: ${slug}`);
  return displayNameMap.get(slug);
}
