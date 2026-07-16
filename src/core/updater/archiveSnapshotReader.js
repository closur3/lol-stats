import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';
import { createSchemaIssue, describeSchemaValue } from '../facts/schemaIssue.js';

function readArchiveSnapshotIssue(snapshot, artifactKey) {
  if (snapshot == null) return createSchemaIssue({ artifactKey, path: "$", kind: "missing", expected: "stored JSON object" });
  if (typeof snapshot !== "object" || Array.isArray(snapshot)) return createSchemaIssue({ artifactKey, path: "$", kind: "invalid", expected: "JSON object", actual: describeSchemaValue(snapshot) });
  if (!snapshot.tournament || typeof snapshot.tournament !== "object" || Array.isArray(snapshot.tournament)) return createSchemaIssue({ artifactKey, path: "tournament", kind: "invalid", expected: "object", actual: describeSchemaValue(snapshot.tournament) });
  if (typeof snapshot.tournament.slug !== "string" || !snapshot.tournament.slug) return createSchemaIssue({ artifactKey, path: "tournament.slug", kind: "invalid", expected: "non-empty string", actual: describeSchemaValue(snapshot.tournament.slug) });
  if (Object.hasOwn(snapshot, "teamMap")) return createSchemaIssue({ artifactKey, path: "teamMap", kind: "invalid", expected: "field absent in current schema", actual: "present" });
  if (Object.hasOwn(snapshot.tournament, "teamMap")) return createSchemaIssue({ artifactKey, path: "tournament.teamMap", kind: "invalid", expected: "field absent in current schema", actual: "present" });
  if (!snapshot.stats || typeof snapshot.stats !== "object" || Array.isArray(snapshot.stats)) return createSchemaIssue({ artifactKey, path: "stats", kind: "invalid", expected: "object", actual: describeSchemaValue(snapshot.stats) });
  if (!snapshot.timeGrid || typeof snapshot.timeGrid !== "object" || Array.isArray(snapshot.timeGrid)) return createSchemaIssue({ artifactKey, path: "timeGrid", kind: "invalid", expected: "object", actual: describeSchemaValue(snapshot.timeGrid) });
  return null;
}

export async function readArchiveSnapshots(env, slugs) {
  if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
  const kv = env["lol-stats-kv"];
  const archiveSnapshots = await Promise.all(slugs.map(slug => kv.get(kvKeys.archive(slug), { type: "json" })));
  const issues = archiveSnapshots.flatMap((archiveSnapshot, index) => {
    const issue = readArchiveSnapshotIssue(archiveSnapshot, kvKeys.archive(slugs[index]));
    return issue ? [issue] : [];
  });
  throwIfArtifactsUnavailable("ArchiveSnapshot", issues);
  return archiveSnapshots;
}
