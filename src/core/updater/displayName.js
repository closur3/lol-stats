export function buildDisplayNameMap(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  return new Map(
    tournaments.map(t => [
      t.slug, t.league || t.name
    ])
  );
}

export function getDisplayName(displayNameMap, slug) {
  const displayName = displayNameMap.get(slug);
  if (!displayName) throw new Error(`Tournament display name missing: ${slug}`);
  return displayName;
}
