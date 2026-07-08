import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertTeamMap } from "../../utils/data/teamMaps.js";

function normalizeActiveTournamentConfig(tournament) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) {
    throw new Error("ConfigActive tournament must be object");
  }
  const slug = typeof tournament.slug === "string" ? tournament.slug.trim() : "";
  const name = typeof tournament.name === "string" ? tournament.name.trim() : "";
  const leagueShort = typeof tournament.leagueShort === "string" ? tournament.leagueShort.trim() : null;
  const startDate = typeof tournament.startDate === "string" ? tournament.startDate.trim() : "";
  const endDate = typeof tournament.endDate === "string" ? tournament.endDate.trim() : "";
  if (!Array.isArray(tournament.overviewPage) || tournament.overviewPage.length === 0) {
    throw new Error(`Invalid tournament overviewPage: ${slug || "(missing slug)"}`);
  }
  if (tournament.overviewPage.some(page => typeof page !== "string" || !page.trim())) {
    throw new Error(`Invalid tournament overviewPage: ${slug || "(missing slug)"}`);
  }
  const overviewPage = tournament.overviewPage.map(page => page.trim());
  if (!slug || !name || leagueShort === null || !startDate || !endDate || overviewPage.length === 0) {
    throw new Error(`Invalid tournament config: ${slug || "(missing slug)"}`);
  }
  const teamMap = assertTeamMap(tournament.teamMap, `ConfigActive.${slug}.teamMap`);
  return { slug, name, leagueShort, overviewPage, startDate, endDate, teamMap };
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
