export function deriveTournamentTransition(archiveTournaments, desiredApplyState, previousApplyState) {
  if (!Array.isArray(archiveTournaments)) throw new Error("archiveTournaments must be an array");
  const currentActiveFingerprints = desiredApplyState.activeFingerprints;
  const previousActiveFingerprints = previousApplyState.activeFingerprints;
  const currentArchiveSlugs = new Set(archiveTournaments.map(tournament => tournament.slug));

  const added = [];
  const updated = [];
  const archived = [];
  const dropped = [];

  for (const [slug, fingerprint] of Object.entries(currentActiveFingerprints)) {
    const previousFingerprint = previousActiveFingerprints[slug];
    if (previousFingerprint === undefined) added.push(slug);
    else if (previousFingerprint !== fingerprint) updated.push(slug);
  }

  for (const slug of Object.keys(previousActiveFingerprints)) {
    if (Object.hasOwn(currentActiveFingerprints, slug)) continue;
    if (currentArchiveSlugs.has(slug)) archived.push(slug);
    else dropped.push(slug);
  }

  return { added, updated, archived, dropped };
}
