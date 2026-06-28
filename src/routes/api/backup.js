import { readArchiveIndex } from "../../core/updater/archiveIndex.js";
import { loadTourConfig } from "../../core/updater/tourConfigLoader.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { requireAdmin } from "./auth.js";
import { readRawMatches } from "../../core/facts/rawMatchesStore.js";
import { ensureScheduleMeta } from "../../core/facts/scheduleMetaStore.js";

function assertDisplaySnapshot(snapshot, key, prefix) {
  const slug = key.slice(prefix.length);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error(`Invalid snapshot: ${key}`);
  }
  if (!snapshot.tournament || snapshot.tournament.slug !== slug) {
    throw new Error(`Invalid snapshot tournament: ${key}`);
  }
  if (!snapshot.stats || typeof snapshot.stats !== "object" || Array.isArray(snapshot.stats)) {
    throw new Error(`Invalid snapshot stats: ${key}`);
  }
  if (!snapshot.timeGrid || typeof snapshot.timeGrid !== "object" || Array.isArray(snapshot.timeGrid)) {
    throw new Error(`Invalid snapshot timeGrid: ${key}`);
  }
  if (!snapshot.teamMap || typeof snapshot.teamMap !== "object" || Array.isArray(snapshot.teamMap)) {
    throw new Error(`Invalid snapshot teamMap: ${key}`);
  }
  return slug;
}

function assertHomeSnapshot(snapshot, key) {
  const slug = assertDisplaySnapshot(snapshot, key, kvKeys.HOME_PREFIX);
  if (!snapshot.scheduleMap || typeof snapshot.scheduleMap !== "object" || Array.isArray(snapshot.scheduleMap)) {
    throw new Error(`Invalid HOME scheduleMap: ${key}`);
  }
  return slug;
}

function assertArchiveSnapshot(snapshot, key) {
  const slug = assertDisplaySnapshot(snapshot, key, kvKeys.ARCHIVE_PREFIX);
  if (!Array.isArray(snapshot.rawMatches)) {
    throw new Error(`Invalid archive rawMatches: ${key}`);
  }
  return slug;
}

async function dumpSnapshotsBySlug(kv, slugs, buildKey, assertSnapshot) {
  if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
  const entries = await Promise.all(slugs.map(async slug => {
    const key = buildKey(slug);
    const snapshot = await kv.get(key, { type: "json" });
    if (!snapshot) return null;
    const resolvedSlug = assertSnapshot(snapshot, key);
    return [resolvedSlug, snapshot];
  }));
  return Object.fromEntries(entries.filter(Boolean));
}

export async function handleBackup(request, env) {
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const kv = env["lol-stats-kv"];
  const tournaments = await loadTourConfig(env);
  const homeSlugs = tournaments.map(t => t.slug);
  const archiveIndex = await kv.get(kvKeys.archiveIndex(), { type: "json" });
  const archiveSlugs = Array.isArray(archiveIndex) ? archiveIndex : [];

  const [home, archive, configArchive] = await Promise.all([
    dumpSnapshotsBySlug(kv, homeSlugs, kvKeys.home, assertHomeSnapshot),
    dumpSnapshotsBySlug(kv, archiveSlugs, kvKeys.archive, assertArchiveSnapshot),
    readArchiveIndex(env)
  ]);
  const rawMatches = {};
  const scheduleMeta = {};
  await Promise.all(Object.keys(home).map(async slug => {
    const [matches, meta] = await Promise.all([
      readRawMatches(env, slug),
      ensureScheduleMeta(env, slug)
    ]);
    rawMatches[slug] = matches;
    scheduleMeta[slug] = meta;
  }));

  return new Response(JSON.stringify({ home, rawMatches, scheduleMeta, archive, configArchive }), {
    headers: { "content-type": "application/json" }
  });
}
