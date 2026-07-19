import { calculateTournamentFingerprint } from "./tournamentConfigDigest.js";

export async function buildTournamentApplyState(config) {
  const activeEntries = await Promise.all(
    config.active.map(async tournament => [tournament.slug, await calculateTournamentFingerprint(tournament)])
  );
  return {
    configDigest: config.configDigest,
    activeFingerprints: Object.fromEntries(activeEntries)
  };
}
