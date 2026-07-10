import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';

function readArchiveSnapshotIssue(archiveSnapshot) {
  if (!archiveSnapshot || typeof archiveSnapshot !== "object" || Array.isArray(archiveSnapshot)) return "Missing ArchiveSnapshot";
  if (!archiveSnapshot.tournament || typeof archiveSnapshot.tournament !== "object" || !archiveSnapshot.tournament.slug) return "Invalid tournament";
  if (Object.hasOwn(archiveSnapshot, "teamMap") || Object.hasOwn(archiveSnapshot.tournament, "teamMap")) return "Legacy team map";
  if (!archiveSnapshot.stats || typeof archiveSnapshot.stats !== "object" || Array.isArray(archiveSnapshot.stats)) return "Invalid stats";
  if (!archiveSnapshot.timeGrid || typeof archiveSnapshot.timeGrid !== "object" || Array.isArray(archiveSnapshot.timeGrid)) return "Invalid time grid";
  return null;
}

export async function readArchiveSnapshots(env, slugs) {
  if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
  const kv = env["lol-stats-kv"];
  const archiveSnapshots = await Promise.all(slugs.map(slug => kv.get(kvKeys.archive(slug), { type: "json" })));
  const issues = archiveSnapshots.flatMap((archiveSnapshot, index) => {
    const reason = readArchiveSnapshotIssue(archiveSnapshot);
    return reason ? [{ slug: slugs[index], reason }] : [];
  });
  throwIfArtifactsUnavailable("ArchiveSnapshot", issues);
  return archiveSnapshots;
}
