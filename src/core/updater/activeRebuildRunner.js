import { readExistingRawMatchesBySlug } from "../facts/rawMatchesStore.js";
import { observeExistingScheduleCarryovers } from "../scheduler/scheduleCarryoverObserver.js";
import { detectRevisionChanges } from "./revisionDetector.js";
import { runActiveUpdate } from "./activeUpdateRunner.js";

const rebuildReasons = new Set(["added", "updated", "force"]);

export async function rebuildActiveTournaments(env, activeTournaments, reasonsBySlug) {
  if (!Array.isArray(activeTournaments)) throw new Error("activeTournaments must be an array");
  if (!(reasonsBySlug instanceof Map)) throw new Error("reasonsBySlug must be a Map");
  if (reasonsBySlug.size === 0) return;
  for (const [slug, reason] of reasonsBySlug) {
    if (typeof slug !== "string" || !slug) throw new Error("Active rebuild slug missing");
    if (!rebuildReasons.has(reason)) throw new Error(`Invalid active rebuild reason: ${reason}`);
  }

  const targetSlugs = new Set(reasonsBySlug.keys());
  const targetTournaments = activeTournaments.filter(tournament => targetSlugs.has(tournament.slug));
  if (targetTournaments.length !== targetSlugs.size) throw new Error("Active rebuild tournament not present in TournamentConfig.active");

  await observeExistingScheduleCarryovers(env, targetTournaments, new Date());
  const rawMatchesBySlug = await readExistingRawMatchesBySlug(env, targetTournaments);
  const { revidChanges, pendingRevisionWrites } = await detectRevisionChanges(env, targetTournaments);
  await runActiveUpdate(env, activeTournaments, rawMatchesBySlug, targetSlugs, {
    reasonsBySlug,
    rebuild: true,
    revidChanges,
    pendingRevisionWrites
  });
}
