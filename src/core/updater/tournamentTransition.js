export function deriveTournamentTransition(archiveTournaments, desiredApplyState, previousApplyState) {
  if (!Array.isArray(archiveTournaments)) throw new Error("archiveTournaments must be an array");
  const currentActiveFingerprints = desiredApplyState.activeFingerprints;
  const previousActiveFingerprints = previousApplyState.activeFingerprints;
  const currentArchiveNames = new Set(archiveTournaments.map(tournament => tournament.name));

  const added = [];
  const updated = [];
  const archived = [];
  const dropped = [];

  for (const [tournamentName, fingerprint] of Object.entries(currentActiveFingerprints)) {
    const previousFingerprint = previousActiveFingerprints[tournamentName];
    if (previousFingerprint === undefined) added.push(tournamentName);
    else if (previousFingerprint !== fingerprint) updated.push(tournamentName);
  }

  for (const tournamentName of Object.keys(previousActiveFingerprints)) {
    if (Object.hasOwn(currentActiveFingerprints, tournamentName)) continue;
    if (currentArchiveNames.has(tournamentName)) archived.push(tournamentName);
    else dropped.push(tournamentName);
  }

  return { added, updated, archived, dropped };
}
