function canonicalTournament(tournament) {
  return {
    slug: tournament.slug,
    name: tournament.name,
    leagueShort: tournament.leagueShort,
    overviewPage: tournament.overviewPage,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    teamMap: Object.fromEntries(Object.entries(tournament.teamMap).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0))
  };
}

async function sha256(value) {
  const bytes = new globalThis.TextEncoder().encode(JSON.stringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildTournamentApplyState(config) {
  const canonicalConfig = {
    active: config.active.map(canonicalTournament),
    archive: config.archive.map(canonicalTournament)
  };
  const activeEntries = await Promise.all(
    canonicalConfig.active.map(async tournament => [tournament.slug, await sha256(tournament)])
  );
  return {
    configDigest: await sha256(canonicalConfig),
    activeFingerprints: Object.fromEntries(activeEntries)
  };
}
