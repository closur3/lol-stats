import { readArchiveConfig } from "../../core/updater/archiveConfigReader.js";
import { readActiveConfig } from "../../core/updater/activeConfigReader.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { requireAdmin } from "./auth.js";

function assertSnapshot(slug, snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error(`Invalid snapshot: ${slug}`);
  }
  if (!snapshot.tournament || snapshot.tournament.slug !== slug) {
    throw new Error(`Invalid snapshot tournament: ${slug}`);
  }
  if (!snapshot.stats || typeof snapshot.stats !== "object" || Array.isArray(snapshot.stats)) {
    throw new Error(`Invalid snapshot stats: ${slug}`);
  }
  if (!snapshot.timeGrid || typeof snapshot.timeGrid !== "object" || Array.isArray(snapshot.timeGrid)) {
    throw new Error(`Invalid snapshot timeGrid: ${slug}`);
  }
  if (!snapshot.teamMap || typeof snapshot.teamMap !== "object" || Array.isArray(snapshot.teamMap)) {
    throw new Error(`Invalid snapshot teamMap: ${slug}`);
  }
}

function assertHomeFields(slug, snapshot) {
  if (!snapshot.scheduleMap || typeof snapshot.scheduleMap !== "object" || Array.isArray(snapshot.scheduleMap)) {
    throw new Error(`Invalid HOME scheduleMap: ${slug}`);
  }
}

async function readSnapshotsBySlug(kv, slugs, buildKey, ...assertFns) {
  const entries = await Promise.all(slugs.map(async slug => {
    const snapshot = await kv.get(buildKey(slug), { type: "json" });
    if (!snapshot) return null;
    for (const fn of assertFns) fn(slug, snapshot);
    return [slug, snapshot];
  }));
  return Object.fromEntries(entries.filter(Boolean));
}

export async function handleBackup(request, env) {
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const kv = env["lol-stats-kv"];
  const [tournaments, archiveTournaments] = await Promise.all([
    readActiveConfig(env),
    readArchiveConfig(env)
  ]);

  const [home, archive] = await Promise.all([
    readSnapshotsBySlug(kv, tournaments.map(t => t.slug), kvKeys.home, assertSnapshot, assertHomeFields),
    readSnapshotsBySlug(kv, archiveTournaments.map(t => t.slug), kvKeys.archive, assertSnapshot)
  ]);

  return new Response(JSON.stringify({ home, archive }), {
    headers: { "content-type": "application/json" }
  });
}
