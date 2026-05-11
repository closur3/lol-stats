import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { dateUtils } from "../../utils/dateUtils.js";

function normalizeArchiveTournament(tournament) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) {
    throw new Error("Archive tournament must be object");
  }
  const slug = typeof tournament.slug === "string" ? tournament.slug.trim() : "";
  const name = typeof tournament.name === "string" ? tournament.name.trim() : "";
  const league = typeof tournament.league === "string" ? tournament.league.trim() : "";
  const startDate = typeof tournament.start_date === "string" ? tournament.start_date.trim() : "";
  const endDate = typeof tournament.end_date === "string" ? tournament.end_date.trim() : "";
  const overviewPage = Array.isArray(tournament.overview_page)
    ? tournament.overview_page.filter(page => typeof page === "string" && page.trim()).map(page => page.trim())
    : (typeof tournament.overview_page === "string" && tournament.overview_page.trim() ? [tournament.overview_page.trim()] : []);
  if (!slug || !name || !league || !startDate || !endDate || overviewPage.length === 0) {
    throw new Error(`Invalid archive tournament: ${slug || "(missing slug)"}`);
  }
  return { slug, name, league, overview_page: overviewPage, start_date: startDate, end_date: endDate };
}

function normalizeArchiveList(list) {
  if (!Array.isArray(list)) throw new Error("CONFIG_ARCHIVE must be array");
  const bySlug = new Map();
  for (const tournament of list) {
    const normalized = normalizeArchiveTournament(tournament);
    bySlug.set(normalized.slug, normalized);
  }
  return dateUtils.sortTournamentsByDate(Array.from(bySlug.values()));
}

export async function loadArchiveConfig(env, githubClient) {
  const kv = env["lol-stats-kv"];
  const cached = await kv.get(kvKeys.configArchive(), { type: "json" });
  if (Array.isArray(cached)) return normalizeArchiveList(cached);

  const archivedTournaments = await githubClient.fetchJson("config/archive.json");
  const normalized = normalizeArchiveList(archivedTournaments);
  if (normalized.length === 0) return readArchiveIndex(env);

  await kv.put(kvKeys.configArchive(), JSON.stringify(normalized));
  return normalized;
}

export async function readArchiveIndex(env) {
  const kv = env["lol-stats-kv"];
  const cached = await kv.get(kvKeys.configArchive(), { type: "json" });
  if (cached == null) return rebuildArchiveIndexFromSnapshots(env);
  return normalizeArchiveList(cached);
}

export async function writeArchiveIndex(env, archivedTournaments) {
  const kv = env["lol-stats-kv"];
  const normalized = normalizeArchiveList(archivedTournaments);
  await kv.put(kvKeys.configArchive(), JSON.stringify(normalized));
  return normalized;
}

export async function upsertArchiveIndex(env, tournament) {
  const current = await readArchiveIndex(env);
  const normalized = normalizeArchiveTournament(tournament);
  const next = current.filter(item => item.slug !== normalized.slug);
  next.push(normalized);
  return writeArchiveIndex(env, next);
}

export async function removeArchiveIndex(env, slug) {
  if (!slug) throw new Error("Archive slug missing");
  const current = await readArchiveIndex(env);
  return writeArchiveIndex(env, current.filter(item => item.slug !== slug));
}

export async function rebuildArchiveIndexFromSnapshots(env) {
  const kv = env["lol-stats-kv"];
  const allKeys = await kv.list({ prefix: kvKeys.ARCHIVE_PREFIX });
  const dataKeys = allKeys.keys.filter(key => key.name !== kvKeys.archiveStatic());
  const rawSnapshots = await Promise.all(dataKeys.map(key => kv.get(key.name, { type: "json" })));
  const tournaments = rawSnapshots
    .map(snapshot => snapshot?.tournament)
    .filter(Boolean);
  return writeArchiveIndex(env, tournaments);
}
