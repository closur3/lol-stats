import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertTeamMap } from "../../utils/data/teamMaps.js";
import { assertParticipantGroups } from "../../utils/data/participantGroups.js";
import { getOverviewPageNames } from "../../utils/data/overviewPages.js";
import { assertTournamentConfigDigest, calculateTournamentConfigDigest } from "./tournamentConfigDigest.js";

const TournamentConfigFields = ["configDigest", "active", "archive"];
const TournamentFields = ["slug", "name", "leagueShort", "overviewPages", "startDate", "endDate", "teamMap", "participantGroups"];
const OverviewPageFields = ["overviewPage", "startDate", "endDate", "participantCount"];
const DatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isDate(value) {
  if (!DatePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeOverviewPages(value, label) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a nonempty array`);
  const overviewPages = value.map((entry, index) => {
    const entryLabel = `${label}[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`${entryLabel} must be an object`);
    const fields = Object.keys(entry);
    if (fields.length !== OverviewPageFields.length || OverviewPageFields.some(field => !Object.hasOwn(entry, field))) {
      throw new Error(`${entryLabel} fields must match the schema`);
    }
    const overviewPage = typeof entry.overviewPage === "string" ? entry.overviewPage.trim() : "";
    const startDate = typeof entry.startDate === "string" ? entry.startDate.trim() : "";
    const endDate = typeof entry.endDate === "string" ? entry.endDate.trim() : "";
    if (!overviewPage || !isDate(startDate) || !isDate(endDate) || startDate > endDate) throw new Error(`${entryLabel} is invalid`);
    if (!Number.isInteger(entry.participantCount) || entry.participantCount < 1) {
      throw new Error(`${entryLabel}.participantCount must be a positive integer`);
    }
    return { overviewPage, startDate, endDate, participantCount: entry.participantCount };
  });
  const names = getOverviewPageNames(overviewPages);
  if (new Set(names).size !== names.length) throw new Error(`${label} contains duplicate overviewPage`);
  return overviewPages;
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
  const overviewPages = normalizeOverviewPages(tournament.overviewPages, `${configName}.${slug || "(missing slug)"}.overviewPages`);
  const overviewPageNames = getOverviewPageNames(overviewPages);
  if (!slug || !name || !leagueShort || !startDate || !endDate) {
    throw new Error(`Invalid ${configName} tournament: ${slug || "(missing slug)"}`);
  }
  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
    throw new Error(`Invalid ${configName} date range: ${slug}`);
  }
  const overviewStartDate = overviewPages.reduce((earliest, page) => page.startDate < earliest ? page.startDate : earliest, overviewPages[0].startDate);
  const overviewEndDate = overviewPages.reduce((latest, page) => page.endDate > latest ? page.endDate : latest, overviewPages[0].endDate);
  if (startDate !== overviewStartDate || endDate !== overviewEndDate) {
    throw new Error(`${configName}.${slug} date range does not match overviewPages`);
  }

  const teamMap = assertTeamMap(tournament.teamMap, `${configName}.${slug}.teamMap`);
  return {
    slug,
    name,
    leagueShort,
    overviewPages,
    startDate,
    endDate,
    teamMap,
    participantGroups: assertParticipantGroups(
      tournament.participantGroups,
      overviewPageNames,
      teamMap,
      `${configName}.${slug}.participantGroups`
    )
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
      for (const page of getOverviewPageNames(tournament.overviewPages)) {
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
