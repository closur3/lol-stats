import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertRawMatches } from "../facts/rawMatchesStore.js";
import { buildArchiveSnapshot } from "./archiveSnapshotBuilder.js";
import { readArchiveSnapshots } from "./archiveSnapshotReader.js";

async function readMigrationRawMatches(env, slug) {
  const rawMatches = await env["lol-stats-kv"].get(kvKeys.rawMatches(slug), { type: "json" });
  if (rawMatches == null) return null;
  assertRawMatches(slug, rawMatches);
  return rawMatches;
}

async function prepareArchiveMigration(env, tournament) {
  const rawMatches = await readMigrationRawMatches(env, tournament.slug);
  if (rawMatches !== null) {
    return { slug: tournament.slug, snapshot: buildArchiveSnapshot(tournament, rawMatches) };
  }
  await readArchiveSnapshots(env, [tournament]);
  return { slug: tournament.slug, snapshot: null };
}

export async function prepareArchiveMigrations(env, archiveTournaments, archiveSlugs) {
  if (!Array.isArray(archiveTournaments)) throw new Error("archiveTournaments must be an array");
  if (!(archiveSlugs instanceof Set)) throw new Error("archiveSlugs must be a Set");
  const targets = archiveTournaments.filter(tournament => archiveSlugs.has(tournament.slug));
  if (targets.length !== archiveSlugs.size) throw new Error("Archive migration tournament not present in TournamentConfig.archive");
  return Promise.all(targets.map(tournament => prepareArchiveMigration(env, tournament)));
}
