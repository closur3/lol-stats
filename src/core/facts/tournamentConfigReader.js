import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertTeamMap } from "../../utils/data/teamMaps.js";
import { assertTournamentConfigDigest, calculateTournamentConfigDigest } from "./tournamentConfigDigest.js";

const TournamentConfigFields = ["configDigest", "active", "archive"];
const TournamentFields = ["slug", "name", "leagueShort", "overviewPage", "startDate", "endDate", "teamMap"];
const DatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isDate(value) {
  if (!DatePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeTournament(configName, tournament) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) {
    throw new Error(`${configName} tournament must be an object`);
  }
  const fields = Object.keys(tournament);
  if (fields.length !== TournamentFields.length || TournamentFields.some(field => !Object.hasOwn(tournament, field))) {
    throw new Error(`${configName} tournament fields must match the schema`);
  }

  const slug = typeof tournament.slug === "string" ? tournament.slug.trim() : "";
  const name = typeof tournament.name === "string" ? tournament.name.trim() : "";
  const leagueShort = typeof tournament.leagueShort === "string" ? tournament.leagueShort.trim() : null;
  const startDate = typeof tournament.startDate === "string" ? tournament.startDate.trim() : "";
  const endDate = typeof tournament.endDate === "string" ? tournament.endDate.trim() : "";
  if (!Array.isArray(tournament.overviewPage) || tournament.overviewPage.length === 0 || tournament.overviewPage.some(page => typeof page !== "string" || !page.trim())) {
    throw new Error(`Invalid ${configName} overviewPage: ${slug || "(missing slug)"}`);
  }
  const overviewPage = tournament.overviewPage.map(page => page.trim());
  if (new Set(overviewPage).size !== overviewPage.length) {
    throw new Error(`Duplicate ${configName} overviewPage: ${slug || "(missing slug)"}`);
  }
  if (!slug || !name || !leagueShort || !startDate || !endDate) {
    throw new Error(`Invalid ${configName} tournament: ${slug || "(missing slug)"}`);
  }
  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
    throw new Error(`Invalid ${configName} date range: ${slug}`);
  }

  return {
    slug,
    name,
    leagueShort,
    overviewPage,
    startDate,
    endDate,
    teamMap: assertTeamMap(tournament.teamMap, `${configName}.${slug}.teamMap`)
  };
}

function normalizeTournamentList(configName, storedConfig) {
  if (!Array.isArray(storedConfig)) throw new Error(`${configName} must be an array`);
  const tournaments = storedConfig.map(tournament => normalizeTournament(configName, tournament));
  const slugs = new Set();
  for (const tournament of tournaments) {
    if (slugs.has(tournament.slug)) throw new Error(`Duplicate ${configName} slug: ${tournament.slug}`);
    slugs.add(tournament.slug);
  }
  return tournaments;
}

function assertConfigFields(storedConfig) {
  if (!storedConfig || typeof storedConfig !== "object" || Array.isArray(storedConfig)) {
    throw new Error("TournamentConfig must be an object");
  }
  const fields = Object.keys(storedConfig);
  if (fields.length !== TournamentConfigFields.length || TournamentConfigFields.some(field => !Object.hasOwn(storedConfig, field))) {
    throw new Error("TournamentConfig fields must be configDigest, active and archive");
  }
}

function assertDisjoint(active, archive) {
  const activeSlugs = new Set(active.map(tournament => tournament.slug));
  const overlap = archive.map(tournament => tournament.slug).filter(slug => activeSlugs.has(slug));
  if (overlap.length > 0) throw new Error(`TournamentConfig active/archive overlap: ${overlap.join(",")}`);
}

function assertOverviewPageOwnership(active, archive) {
  const owners = new Map();
  for (const [group, tournaments] of [["active", active], ["archive", archive]]) {
    for (const tournament of tournaments) {
      for (const page of tournament.overviewPage) {
        const owner = `${group}:${tournament.slug}`;
        const currentOwner = owners.get(page);
        if (currentOwner !== undefined && currentOwner !== owner) {
          throw new Error(`TournamentConfig overviewPage identity conflict: ${page}`);
        }
        owners.set(page, owner);
      }
    }
  }
}

export async function readTournamentConfig(env) {
  const storedConfig = await env["lol-stats-kv"].get(kvKeys.tournamentConfig(), { type: "json" });
  if (storedConfig == null) throw new Error("TournamentConfig missing");
  assertConfigFields(storedConfig);

  const config = {
    configDigest: assertTournamentConfigDigest(storedConfig.configDigest),
    active: normalizeTournamentList("TournamentConfig.active", storedConfig.active),
    archive: normalizeTournamentList("TournamentConfig.archive", storedConfig.archive)
  };
  assertDisjoint(config.active, config.archive);
  assertOverviewPageOwnership(config.active, config.archive);
  const calculatedDigest = await calculateTournamentConfigDigest(config);
  if (calculatedDigest !== config.configDigest) {
    throw new Error("TournamentConfig.configDigest does not match config content");
  }
  return config;
}
