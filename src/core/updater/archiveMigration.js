import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { readArchiveConfig } from "./archiveConfigReader.js";
import { buildArchiveSnapshot } from "./archiveSnapshotBuilder.js";

function assertActiveArchiveDisjoint(activeTournaments, archiveTournaments) {
  const activeSlugs = new Set(activeTournaments.map(tournament => tournament.slug));
  const overlap = archiveTournaments
    .map(tournament => tournament.slug)
    .filter(slug => activeSlugs.has(slug));
  if (overlap.length > 0) {
    throw new Error(`ConfigActive and ConfigArchive overlap: ${overlap.join(",")}`);
  }
}

async function readMigrationRawMatches(env, slug) {
  const rawMatches = await env["lol-stats-kv"].get(kvKeys.rawMatches(slug), { type: "json" });
  if (rawMatches == null) return null;
  if (!Array.isArray(rawMatches)) throw new Error(`RawMatches invalid for archive migration: ${slug}`);
  return rawMatches;
}

async function deleteActiveRuntimeFacts(env, slug) {
  const kv = env["lol-stats-kv"];
  await Promise.all([
    kv.delete(kvKeys.home(slug)),
    kv.delete(kvKeys.log(slug)),
    kv.delete(kvKeys.rev(slug)),
    kv.delete(kvKeys.rawMatches(slug)),
    kv.delete(kvKeys.scheduleMeta(slug))
  ]);
}

async function migrateArchiveTournament(env, tournament) {
  const rawMatches = await readMigrationRawMatches(env, tournament.slug);
  if (rawMatches == null) return null;

  const archiveSnapshot = buildArchiveSnapshot(tournament, rawMatches);
  await env["lol-stats-kv"].put(kvKeys.archive(tournament.slug), JSON.stringify(archiveSnapshot));
  await deleteActiveRuntimeFacts(env, tournament.slug);
  return tournament.slug;
}

export async function migrateArchiveSnapshotsFromActiveFacts(env, activeTournaments) {
  if (!Array.isArray(activeTournaments)) throw new Error("activeTournaments must be an array");
  const archiveTournaments = await readArchiveConfig(env);
  assertActiveArchiveDisjoint(activeTournaments, archiveTournaments);

  const migrated = [];
  for (const tournament of archiveTournaments) {
    const slug = await migrateArchiveTournament(env, tournament);
    if (slug) migrated.push(slug);
  }

  if (migrated.length > 0) {
    console.log(`[ARCHIVE:MIGRATE] slugs=${migrated.join(",")}`);
  }
  return { migrated };
}
