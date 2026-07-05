import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { rebuildArchiveIndexFromSnapshots } from "./archiveIndex.js";
import { buildArchiveTournamentFromPayload } from "./archiveSnapshotBuilder.js";

export async function writeManualArchiveSnapshot(env, payload) {
  const snapshot = {
    tournament: buildArchiveTournamentFromPayload(payload),
    rawMatches: [],
    stats: {},
    timeGrid: {},
    teamMap: {}
  };

  await env["lol-stats-kv"].put(kvKeys.archive(payload.slug), JSON.stringify(snapshot));
  await rebuildArchiveIndexFromSnapshots(env);
}
