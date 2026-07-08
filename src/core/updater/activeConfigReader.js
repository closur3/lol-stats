import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertTeamMap } from "../../utils/data/teamMaps.js";

function normalizeActiveTournamentConfig(tournament) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) {
    throw new Error("ConfigActive tournament must be object");
  }
  const slug = typeof tournament.slug === "string" ? tournament.slug.trim() : "";
  const name = typeof tournament.name === "string" ? tournament.name.trim() : "";
  const league = typeof tournament.league === "string" ? tournament.league.trim() : "";
  const startDate = typeof tournament.start_date === "string" ? tournament.start_date.trim() : "";
  const endDate = typeof tournament.end_date === "string" ? tournament.end_date.trim() : "";
  const overviewPage = Array.isArray(tournament.overview_page)
    ? tournament.overview_page.filter(page => typeof page === "string" && page.trim()).map(page => page.trim())
    : [];
  if (!slug || !name || !league || !startDate || !endDate || overviewPage.length === 0) {
    throw new Error(`Invalid tournament config: ${slug || "(missing slug)"}`);
  }
  const teamMap = assertTeamMap(tournament.teamMap, `ConfigActive.${slug}.teamMap`);
  return { ...tournament, slug, name, league, overview_page: overviewPage, start_date: startDate, end_date: endDate, teamMap };
}

function normalizeActiveConfig(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("ConfigActive must be array");
  const normalized = tournaments.map(normalizeActiveTournamentConfig);
  const slugs = new Set();
  for (const tournament of normalized) {
    if (slugs.has(tournament.slug)) throw new Error(`Duplicate ConfigActive slug: ${tournament.slug}`);
    slugs.add(tournament.slug);
  }
  return normalized;
}

export async function readActiveConfig(env) {
  const kv = env["lol-stats-kv"];
  const storedConfig = await kv.get(kvKeys.configActive(), { type: "json" });
  if (storedConfig == null) throw new Error("ConfigActive missing");
  return normalizeActiveConfig(storedConfig);
}
