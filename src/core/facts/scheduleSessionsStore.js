import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { buildScheduleSessions } from "../analysis/scheduleSessions.js";
import { parseScheduleSessionKey } from "../scheduleIdentity.js";
import { assertTeamMap } from "../../utils/data/teamMaps.js";
import { readRawMatches } from "./rawMatchesStore.js";

const RootFields = ["sessions"];
const SessionFields = ["sessionKey", "matches"];
const MatchFields = [
  "matchId",
  "scheduledAt",
  "team1Name",
  "team2Name",
  "team1Score",
  "team2Score",
  "bestOf",
  "winner",
  "isForfeit",
  "isLive"
];

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
}

function assertExactFields(value, fields, label) {
  const actual = Object.keys(value);
  if (actual.length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) {
    throw new Error(`${label} fields must match the schema`);
  }
}

function readText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function readPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
  return value;
}

function readNonnegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative integer`);
  return value;
}

function readBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean`);
  return value;
}

function readWinner(value, label) {
  if (value === null) return null;
  if (![0, 1, 2].includes(value)) throw new Error(`${label} must be null, 0, 1, or 2`);
  return value;
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareMatches(left, right) {
  return left.scheduledAt - right.scheduledAt || compareText(left.matchId, right.matchId);
}

function normalizeMatch(match, label) {
  assertObject(match, label);
  assertExactFields(match, MatchFields, label);
  const normalized = {
    matchId: readText(match.matchId, `${label}.matchId`),
    scheduledAt: readPositiveInteger(match.scheduledAt, `${label}.scheduledAt`),
    team1Name: readText(match.team1Name, `${label}.team1Name`),
    team2Name: readText(match.team2Name, `${label}.team2Name`),
    team1Score: readNonnegativeInteger(match.team1Score, `${label}.team1Score`),
    team2Score: readNonnegativeInteger(match.team2Score, `${label}.team2Score`),
    bestOf: Number(match.bestOf),
    winner: readWinner(match.winner, `${label}.winner`),
    isForfeit: readBoolean(match.isForfeit, `${label}.isForfeit`),
    isLive: readBoolean(match.isLive, `${label}.isLive`)
  };
  if (![1, 2, 3, 5].includes(normalized.bestOf) || normalized.bestOf !== match.bestOf) {
    throw new Error(`${label}.bestOf must be 1, 2, 3, or 5`);
  }
  if (normalized.winner !== null && normalized.isLive) {
    throw new Error(`${label}.isLive must be false when winner is known`);
  }
  return normalized;
}

function normalizeSession(session, label, matchIds) {
  assertObject(session, label);
  assertExactFields(session, SessionFields, label);
  const sessionKey = readText(session.sessionKey, `${label}.sessionKey`);
  parseScheduleSessionKey(sessionKey, `${label}.sessionKey`);
  if (!Array.isArray(session.matches) || session.matches.length === 0) {
    throw new Error(`${label}.matches must be a nonempty array`);
  }
  const matches = session.matches.map((match, index) => normalizeMatch(match, `${label}.matches[${index}]`));
  for (const match of matches) {
    if (matchIds.has(match.matchId)) throw new Error(`${label} contains duplicate matchId: ${match.matchId}`);
    matchIds.add(match.matchId);
  }
  for (let index = 1; index < matches.length; index++) {
    if (compareMatches(matches[index - 1], matches[index]) > 0) {
      throw new Error(`${label}.matches must be sorted by scheduledAt and matchId`);
    }
  }
  return { sessionKey, matches };
}

export function assertScheduleSessionsFields(label, value) {
  assertObject(value, label);
  assertExactFields(value, RootFields, label);
  if (!Array.isArray(value.sessions)) throw new Error(`${label}.sessions must be an array`);

  const matchIds = new Set();
  const sessionKeys = new Set();
  const sessions = value.sessions.map((session, index) => normalizeSession(
    session,
    `${label}.sessions[${index}]`,
    matchIds
  ));
  for (const session of sessions) {
    if (sessionKeys.has(session.sessionKey)) {
      throw new Error(`${label}.sessions contains duplicate sessionKey: ${session.sessionKey}`);
    }
    sessionKeys.add(session.sessionKey);
  }
  for (let index = 1; index < sessions.length; index++) {
    const previous = sessions[index - 1];
    const current = sessions[index];
    const comparison = previous.matches[0].scheduledAt - current.matches[0].scheduledAt
      || compareText(previous.sessionKey, current.sessionKey);
    if (comparison > 0) throw new Error(`${label}.sessions must be sorted by first match and sessionKey`);
  }
  return { sessions };
}

export function normalizeScheduleSessions(slug, value) {
  const normalizedSlug = readText(slug, "schedule sessions slug");
  return {
    slug: normalizedSlug,
    ...assertScheduleSessionsFields(`ScheduleSessions.${normalizedSlug}`, value)
  };
}

function readTournamentSlug(tournament) {
  assertObject(tournament, "tournament");
  const slug = readText(tournament.slug, "tournament.slug");
  assertTeamMap(tournament.teamMap, `tournament.${slug}.teamMap`);
  return slug;
}

export async function rebuildScheduleSessionsFromRawMatches(env, tournament) {
  const slug = readTournamentSlug(tournament);
  const rawMatches = await readRawMatches(env, slug);
  return writeScheduleSessions(env, slug, buildScheduleSessions(rawMatches, tournament));
}

export async function readScheduleSessions(env, slug) {
  const normalizedSlug = readText(slug, "schedule sessions slug");
  const value = await env["lol-stats-kv"].get(kvKeys.scheduleSessions(normalizedSlug), { type: "json" });
  if (value == null) throw new Error(`ScheduleSessions missing: ${normalizedSlug}`);
  return normalizeScheduleSessions(normalizedSlug, value);
}

export async function readExistingScheduleSessions(env, slug) {
  const normalizedSlug = readText(slug, "schedule sessions slug");
  const value = await env["lol-stats-kv"].get(kvKeys.scheduleSessions(normalizedSlug), { type: "json" });
  if (value == null) return null;
  return normalizeScheduleSessions(normalizedSlug, value);
}

export async function ensureScheduleSessions(env, tournament) {
  const slug = readTournamentSlug(tournament);
  const value = await env["lol-stats-kv"].get(kvKeys.scheduleSessions(slug), { type: "json" });
  if (value == null) return rebuildScheduleSessionsFromRawMatches(env, tournament);
  return normalizeScheduleSessions(slug, value);
}

export async function writeScheduleSessions(env, slug, value) {
  const normalized = normalizeScheduleSessions(slug, value);
  const stored = { sessions: normalized.sessions };
  await env["lol-stats-kv"].put(kvKeys.scheduleSessions(normalized.slug), JSON.stringify(stored));
  return normalized;
}
