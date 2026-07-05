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
  const normalized = [];
  const slugs = new Set();
  for (const tournament of list) {
    const normalizedTournament = normalizeArchiveTournament(tournament);
    if (slugs.has(normalizedTournament.slug)) {
      throw new Error(`Duplicate CONFIG_ARCHIVE slug: ${normalizedTournament.slug}`);
    }
    slugs.add(normalizedTournament.slug);
    normalized.push(normalizedTournament);
  }
  return normalized;
}

function normalizeGeneratedArchiveList(list) {
  return dateUtils.sortTournamentsByDate(normalizeArchiveList(list));
}

async function readArchiveSnapshotTournaments(env) {
  const kv = env["lol-stats-kv"];
  const allKeys = await kv.list({ prefix: kvKeys.ARCHIVE_PREFIX });
  const slugs = allKeys.keys.map(key => key.name.slice(kvKeys.ARCHIVE_PREFIX.length));
  const snapshots = await Promise.all(slugs.map(slug => kv.get(kvKeys.archive(slug), { type: "json" })));
  return snapshots.map((snapshot, index) => {
    if (!snapshot?.tournament) throw new Error(`Invalid archive snapshot: ${slugs[index]}`);
    return snapshot.tournament;
  });
}

export async function readArchiveIndex(env) {
  const kv = env["lol-stats-kv"];
  const storedIndex = await kv.get(kvKeys.configArchive(), { type: "json" });
  if (storedIndex == null) throw new Error("CONFIG_ARCHIVE missing");
  return normalizeArchiveList(storedIndex);
}

export async function writeArchiveIndex(env, archivedTournaments, options = {}) {
  const kv = env["lol-stats-kv"];
  const normalized = options.generated === true
    ? normalizeGeneratedArchiveList(archivedTournaments)
    : normalizeArchiveList(archivedTournaments);
  if (normalized.length === 0 && options.allowEmpty !== true) {
    throw new Error("Refusing to write empty CONFIG_ARCHIVE");
  }
  await kv.put(kvKeys.configArchive(), JSON.stringify(normalized));
  return normalized;
}

export async function rebuildArchiveIndexFromSnapshots(env, options = {}) {
  const localTournaments = await readArchiveSnapshotTournaments(env);
  if (localTournaments.length === 0 && options.allowEmpty !== true) {
    throw new Error("Cannot rebuild CONFIG_ARCHIVE from empty ARCHIVE snapshots");
  }
  return writeArchiveIndex(env, localTournaments, { allowEmpty: options.allowEmpty === true, generated: true });
}
