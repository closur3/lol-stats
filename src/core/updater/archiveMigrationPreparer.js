import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertRawMatches } from "../facts/rawMatchesStore.js";
import { buildArchiveSnapshot } from "./archiveSnapshotBuilder.js";
import { readArchiveSnapshots } from "./archiveSnapshotReader.js";

async function readMigrationRawMatches(env, tournamentName) {
  const rawMatches = await env["lol-stats-kv"].get(kvKeys.rawMatches(tournamentName), { type: "json" });
  if (rawMatches == null) return null;
  assertRawMatches(tournamentName, rawMatches);
  return rawMatches;
}

async function prepareArchiveMigration(env, tournament) {
  const rawMatches = await readMigrationRawMatches(env, tournament.name);
  if (rawMatches !== null) {
    return { tournamentName: tournament.name, snapshot: buildArchiveSnapshot(tournament, rawMatches) };
  }
  await readArchiveSnapshots(env, [tournament]);
  return { tournamentName: tournament.name, snapshot: null };
}

export async function prepareArchiveMigrations(env, archiveTournaments, archiveNames) {
  if (!Array.isArray(archiveTournaments)) throw new Error("archiveTournaments must be an array");
  if (!(archiveNames instanceof Set)) throw new Error("archiveNames must be a Set");
  const targets = archiveTournaments.filter(tournament => archiveNames.has(tournament.name));
  if (targets.length !== archiveNames.size) throw new Error("Archive migration tournament not present in TournamentConfig.archive");
  return Promise.all(targets.map(tournament => prepareArchiveMigration(env, tournament)));
}
