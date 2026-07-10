import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertTeamMap } from "../../utils/data/teamMaps.js";

function normalizeTournamentConfig(configName, tournament) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) {
    throw new Error(`${configName} tournament must be an object`);
  }

  const slug = typeof tournament.slug === "string" ? tournament.slug.trim() : "";
  const name = typeof tournament.name === "string" ? tournament.name.trim() : "";
  const leagueShort = typeof tournament.leagueShort === "string" ? tournament.leagueShort.trim() : null;
  const startDate = typeof tournament.startDate === "string" ? tournament.startDate.trim() : "";
  const endDate = typeof tournament.endDate === "string" ? tournament.endDate.trim() : "";
  if (!Array.isArray(tournament.overviewPage) || tournament.overviewPage.length === 0 || tournament.overviewPage.some(page => typeof page !== "string" || !page.trim())) {
    throw new Error(`Invalid ${configName} overviewPage: ${slug || "(missing slug)"}`);
  }
  if (!slug || !name || leagueShort === null || !startDate || !endDate) {
    throw new Error(`Invalid ${configName} tournament: ${slug || "(missing slug)"}`);
  }

  return {
    slug,
    name,
    leagueShort,
    overviewPage: tournament.overviewPage.map(page => page.trim()),
    startDate,
    endDate,
    teamMap: assertTeamMap(tournament.teamMap, `${configName}.${slug}.teamMap`)
  };
}

async function readTournamentConfig(env, configName, configKey) {
  const storedConfig = await env["lol-stats-kv"].get(configKey, { type: "json" });
  if (storedConfig == null) throw new Error(`${configName} missing`);
  if (!Array.isArray(storedConfig)) throw new Error(`${configName} must be an array`);

  const tournaments = storedConfig.map(tournament => normalizeTournamentConfig(configName, tournament));
  const slugs = new Set();
  for (const tournament of tournaments) {
    if (slugs.has(tournament.slug)) throw new Error(`Duplicate ${configName} slug: ${tournament.slug}`);
    slugs.add(tournament.slug);
  }
  return tournaments;
}

export function readActiveConfig(env) {
  return readTournamentConfig(env, "ConfigActive", kvKeys.configActive());
}

export function readArchiveConfig(env) {
  return readTournamentConfig(env, "ConfigArchive", kvKeys.configArchive());
}
