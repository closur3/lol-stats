import { readExistingRawMatchesBySlug } from "../facts/rawMatchesStore.js";
import { detectRevisionChanges } from "./revisionDetector.js";
import { prepareActiveUpdate } from "./activeUpdatePreparer.js";
import { rejectActiveUpdate } from "./activeUpdateRejection.js";

const rebuildReasons = new Set(["added", "updated"]);

export async function prepareActiveTournaments(env, activeTournaments, reasonsBySlug) {
  if (!Array.isArray(activeTournaments)) throw new Error("activeTournaments must be an array");
  if (!(reasonsBySlug instanceof Map)) throw new Error("reasonsBySlug must be a Map");
  if (reasonsBySlug.size === 0) return { pendingRevisionWrites: {}, activeUpdatePlan: null };
  for (const [slug, reason] of reasonsBySlug) {
    if (typeof slug !== "string" || !slug) throw new Error("Active rebuild slug missing");
    if (!rebuildReasons.has(reason)) throw new Error(`Invalid active rebuild reason: ${reason}`);
  }

  const targetSlugs = new Set(reasonsBySlug.keys());
  const targetTournaments = activeTournaments.filter(tournament => targetSlugs.has(tournament.slug));
  if (targetTournaments.length !== targetSlugs.size) throw new Error("Active rebuild tournament not present in TournamentConfig.active");

  const rawMatchesBySlug = await readExistingRawMatchesBySlug(env, targetTournaments);
  const { revidChanges, pendingRevisionWrites } = await detectRevisionChanges(env, targetTournaments);
  const activeUpdatePlan = await prepareActiveUpdate(env, activeTournaments, rawMatchesBySlug, targetSlugs, {
    reasonsBySlug,
    rebuild: true,
    revidChanges
  });
  if (!activeUpdatePlan.accepted) await rejectActiveUpdate(env, activeUpdatePlan);
  return { pendingRevisionWrites, activeUpdatePlan };
}
