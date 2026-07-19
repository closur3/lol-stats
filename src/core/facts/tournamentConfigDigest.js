const DigestPattern = /^[a-f0-9]{64}$/;

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

export function assertTournamentConfigDigest(value, label = "TournamentConfig.configDigest") {
  if (typeof value !== "string" || !DigestPattern.test(value)) {
    throw new Error(`${label} must be a SHA-256 digest`);
  }
  return value;
}

export async function calculateTournamentConfigDigest(config) {
  return sha256({
    active: config.active.map(canonicalTournament),
    archive: config.archive.map(canonicalTournament)
  });
}

export async function calculateTournamentFingerprint(tournament) {
  return sha256(canonicalTournament(tournament));
}
