import { readExistingRawMatchesByName } from "../facts/rawMatchesStore.js";
import { detectRevisionChanges } from "./revisionDetector.js";
import { prepareActiveUpdate } from "./activeUpdatePreparer.js";
import { rejectActiveUpdate } from "./activeUpdateRejection.js";

const rebuildReasons = new Set(["added", "updated"]);

export async function prepareActiveTournaments(env, activeTournaments, reasonsByName) {
  if (!Array.isArray(activeTournaments)) throw new Error("activeTournaments must be an array");
  if (!(reasonsByName instanceof Map)) throw new Error("reasonsByName must be a Map");
  if (reasonsByName.size === 0) return { pendingRevisionWrites: {}, activeUpdatePlan: null };
  for (const [tournamentName, reason] of reasonsByName) {
    if (typeof tournamentName !== "string" || !tournamentName) throw new Error("Active rebuild tournamentName missing");
    if (!rebuildReasons.has(reason)) throw new Error(`Invalid active rebuild reason: ${reason}`);
  }

  const targetNames = new Set(reasonsByName.keys());
  const targetTournaments = activeTournaments.filter(tournament => targetNames.has(tournament.name));
  if (targetTournaments.length !== targetNames.size) throw new Error("Active rebuild tournament not present in TournamentConfig.active");

  const rawMatchesByName = await readExistingRawMatchesByName(env, targetTournaments);
  const { revidChanges, pendingRevisionWrites } = await detectRevisionChanges(env, targetTournaments);
  const activeUpdatePlan = await prepareActiveUpdate(env, activeTournaments, rawMatchesByName, targetNames, {
    reasonsByName,
    rebuild: true,
    revidChanges
  });
  if (!activeUpdatePlan.accepted) await rejectActiveUpdate(env, activeUpdatePlan);
  return { pendingRevisionWrites, activeUpdatePlan };
}
