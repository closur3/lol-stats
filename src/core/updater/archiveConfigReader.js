import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertTeamMap } from "../../utils/data/teamMaps.js";

function normalizeArchiveTournament(tournament) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) {
    throw new Error("ConfigArchive tournament must be object");
  }
  const slug = typeof tournament.slug === "string" ? tournament.slug.trim() : "";
  const name = typeof tournament.name === "string" ? tournament.name.trim() : "";
  const league = typeof tournament.league === "string" ? tournament.league.trim() : null;
  const startDate = typeof tournament.start_date === "string" ? tournament.start_date.trim() : "";
  const endDate = typeof tournament.end_date === "string" ? tournament.end_date.trim() : "";
  if (!Array.isArray(tournament.overview_page) || tournament.overview_page.length === 0) {
    throw new Error(`Invalid ConfigArchive overview_page: ${slug || "(missing slug)"}`);
  }
  if (tournament.overview_page.some(page => typeof page !== "string" || !page.trim())) {
    throw new Error(`Invalid ConfigArchive overview_page: ${slug || "(missing slug)"}`);
  }
  const overviewPage = tournament.overview_page.map(page => page.trim());
  if (!slug || !name || league === null || !startDate || !endDate || overviewPage.length === 0) {
    throw new Error(`Invalid ConfigArchive tournament: ${slug || "(missing slug)"}`);
  }
  const teamMap = assertTeamMap(tournament.teamMap, `ConfigArchive.${slug}.teamMap`);
  return { slug, name, league, overview_page: overviewPage, start_date: startDate, end_date: endDate, teamMap };
}

function normalizeArchiveConfig(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("ConfigArchive must be array");
  const slugs = new Set();
  return tournaments.map(tournament => {
    const normalized = normalizeArchiveTournament(tournament);
    if (slugs.has(normalized.slug)) throw new Error(`Duplicate ConfigArchive slug: ${normalized.slug}`);
    slugs.add(normalized.slug);
    return normalized;
  });
}

export async function readArchiveConfig(env) {
  const storedConfig = await env["lol-stats-kv"].get(kvKeys.configArchive(), { type: "json" });
  if (storedConfig == null) throw new Error("ConfigArchive missing");
  return normalizeArchiveConfig(storedConfig);
}
