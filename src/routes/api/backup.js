import { readActiveConfig, readArchiveConfig } from "../../core/facts/tournamentConfigReader.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { requireAdmin } from "./auth.js";

function assertSnapshot(slug, snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error(`Invalid snapshot: ${slug}`);
  }
  if (!snapshot.tournament || snapshot.tournament.slug !== slug) {
    throw new Error(`Invalid snapshot tournament: ${slug}`);
  }
  if (Object.hasOwn(snapshot, "teamMap") || Object.hasOwn(snapshot.tournament, "teamMap")) {
    throw new Error(`Legacy snapshot teamMap: ${slug}`);
  }
  if (!snapshot.stats || typeof snapshot.stats !== "object" || Array.isArray(snapshot.stats)) {
    throw new Error(`Invalid snapshot stats: ${slug}`);
  }
  if (!snapshot.timeGrid || typeof snapshot.timeGrid !== "object" || Array.isArray(snapshot.timeGrid)) {
    throw new Error(`Invalid snapshot timeGrid: ${slug}`);
  }
}

function assertHomeFields(slug, snapshot) {
  if (!snapshot.scheduleMap || typeof snapshot.scheduleMap !== "object" || Array.isArray(snapshot.scheduleMap)) {
    throw new Error(`Invalid HOME scheduleMap: ${slug}`);
  }
}

async function readSnapshotsBySlug(kv, label, slugs, buildKey, ...assertFns) {
  const entries = await Promise.all(slugs.map(async slug => {
    const snapshot = await kv.get(buildKey(slug), { type: "json" });
    if (!snapshot) throw new Error(`${label} missing: ${slug}`);
    for (const fn of assertFns) fn(slug, snapshot);
    return [slug, snapshot];
  }));
  return Object.fromEntries(entries);
}

function readIncludeArchive(request) {
  const value = new URL(request.url).searchParams.get("includeArchive");
  if (value === null || value === "false") return false;
  if (value === "true") return true;
  throw new Error("includeArchive must be true or false");
}

async function readHomeBackup(kv, env) {
  const tournaments = await readActiveConfig(env);
  return readSnapshotsBySlug(kv, "ActiveHome", tournaments.map(tournament => tournament.slug), kvKeys.home, assertSnapshot, assertHomeFields);
}

async function readArchiveBackup(kv, env) {
  const archiveTournaments = await readArchiveConfig(env);
  return readSnapshotsBySlug(kv, "ArchiveSnapshot", archiveTournaments.map(tournament => tournament.slug), kvKeys.archive, assertSnapshot);
}

export async function handleBackup(request, env) {
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const kv = env["lol-stats-kv"];
    const includeArchive = readIncludeArchive(request);
    const home = await readHomeBackup(kv, env);
    const payload = { home };
    if (includeArchive) payload.archive = await readArchiveBackup(kv, env);

    return new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    return new Response(`Backup Error: ${error.message}`, { status: 500 });
  }
}
