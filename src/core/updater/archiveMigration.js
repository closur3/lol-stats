import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { buildArchiveSnapshot } from "./archiveSnapshotBuilder.js";
import { deleteActiveRuntimeFacts } from "./activeTournamentDeletion.js";
import { readArchiveSnapshots } from "./archiveSnapshotReader.js";

async function readMigrationRawMatches(env, slug) {
  const rawMatches = await env["lol-stats-kv"].get(kvKeys.rawMatches(slug), { type: "json" });
  if (rawMatches == null) return null;
  if (!Array.isArray(rawMatches)) throw new Error(`RawMatches invalid for archive migration: ${slug}`);
  return rawMatches;
}

async function migrateArchiveTournament(env, tournament) {
  const rawMatches = await readMigrationRawMatches(env, tournament.slug);
  if (rawMatches == null) {
    await readArchiveSnapshots(env, [tournament]);
    await deleteActiveRuntimeFacts(env, tournament.slug);
    return tournament.slug;
  }

  const archiveSnapshot = buildArchiveSnapshot(tournament, rawMatches);
  await env["lol-stats-kv"].put(kvKeys.archive(tournament.slug), JSON.stringify(archiveSnapshot));
  await deleteActiveRuntimeFacts(env, tournament.slug);
  return tournament.slug;
}

export async function migrateArchiveTournaments(env, archiveTournaments, archiveSlugs) {
  if (!Array.isArray(archiveTournaments)) throw new Error("archiveTournaments must be an array");
  if (!(archiveSlugs instanceof Set)) throw new Error("archiveSlugs must be a Set");
  const targets = archiveTournaments.filter(tournament => archiveSlugs.has(tournament.slug));
  if (targets.length !== archiveSlugs.size) throw new Error("Archive migration tournament not present in TournamentConfig.archive");

  const migrated = [];
  for (const tournament of targets) {
    const slug = await migrateArchiveTournament(env, tournament);
    if (slug) migrated.push(slug);
  }

  if (migrated.length > 0) {
    console.log(`[ARCHIVE:MIGRATE] slugs=${migrated.join(",")}`);
  }
  return { migrated };
}
