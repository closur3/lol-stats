import { readExistingRawMatchesBySlug } from "../facts/rawMatchesStore.js";
import { detectRevisionChanges } from "./revisionDetector.js";
import { runActiveUpdate } from "./activeUpdateRunner.js";

export async function forceActiveTournaments(env, activeTournaments, forceSlugs) {
  if (!Array.isArray(activeTournaments)) throw new Error("activeTournaments must be an array");
  if (!(forceSlugs instanceof Set)) throw new Error("forceSlugs must be a Set");
  if (forceSlugs.size === 0) return;

  const forcedTournaments = activeTournaments.filter(tournament => forceSlugs.has(tournament.slug));
  if (forcedTournaments.length !== forceSlugs.size) throw new Error("Force tournament not present in TournamentConfig.active");

  const rawMatchesBySlug = await readExistingRawMatchesBySlug(env, forcedTournaments);
  const { revidChanges, pendingRevisionWrites } = await detectRevisionChanges(env, forcedTournaments);
  await runActiveUpdate(env, activeTournaments, rawMatchesBySlug, true, forceSlugs, {
    forceWrite: true,
    revidChanges,
    pendingRevisionWrites
  });
}
