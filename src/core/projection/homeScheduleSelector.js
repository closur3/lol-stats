import { timePolicy } from "../../utils/timePolicy.js";
import { assertScheduleCarryoverReferences } from "../analysis/scheduleCarryover.js";
import { assertScheduleCarryoverFields } from "../facts/scheduleCarryoverStore.js";
import { assertScheduleSessionsFields } from "../facts/scheduleSessionsStore.js";
import { parseScheduleSessionKey } from "../scheduleIdentity.js";

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value;
}

function assertFields(value, fields, label) {
  requireObject(value, label);
  const actualFields = Object.keys(value);
  if (actualFields.length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) {
    throw new Error(`${label} fields must be ${fields.join(" and ")}`);
  }
}

function readNowTimestamp(now) {
  const timestamp = now instanceof Date ? now.getTime() : now;
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error("now must be a Date or non-negative integer timestamp");
  }
  return timestamp;
}

function readTournaments(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const slugs = new Set();
  return tournaments.map((tournament, tournamentIndex) => {
    const label = `tournaments[${tournamentIndex}]`;
    requireObject(tournament, label);
    if (typeof tournament.slug !== "string" || tournament.slug.trim() === "") {
      throw new Error(`${label}.slug must be a string`);
    }
    if (typeof tournament.leagueShort !== "string" || tournament.leagueShort.trim() === "") {
      throw new Error(`${label}.leagueShort must be a string`);
    }
    if (slugs.has(tournament.slug)) throw new Error(`Duplicate tournament slug: ${tournament.slug}`);
    slugs.add(tournament.slug);
    return {
      slug: tournament.slug,
      leagueShort: tournament.leagueShort,
      tournamentIndex
    };
  });
}

function assertMapScope(value, label, tournamentSlugs) {
  if (!(value instanceof Map)) throw new Error(`${label} must be a Map`);
  for (const slug of value.keys()) {
    if (!tournamentSlugs.has(slug)) throw new Error(`${label} contains unexpected slug: ${String(slug)}`);
  }
  for (const slug of tournamentSlugs) {
    if (!value.has(slug)) throw new Error(`${label} missing slug: ${slug}`);
  }
}

function readStoreValue(map, slug, field, artifactName, assertArtifactFields) {
  const stored = map.get(slug);
  const label = `${artifactName}.${slug}`;
  assertFields(stored, ["slug", field], label);
  if (stored.slug !== slug) throw new Error(`${label}.slug must match ${slug}`);
  return assertArtifactFields(label, { [field]: stored[field] });
}

function collectActiveCarryoverKeys(entries, nowTimestamp) {
  const keys = new Set();
  for (const entry of entries) {
    if (entry.observedAt <= nowTimestamp && nowTimestamp < entry.expiresAt) {
      keys.add(entry.sessionKey);
    }
  }
  return keys;
}

function readSessionMatches(session, today) {
  const matches = session.matches.map(match => {
    const dateTime = timePolicy.getCurrentAppDateTime(match.scheduledAt);
    return {
      source: match,
      date: dateTime.dateString,
      time: dateTime.timeString.slice(0, 5),
      timestamp: dateTime.timestamp
    };
  });
  const dates = new Set(matches.map(match => match.date));
  const naturallyCrossesToday = dates.has(today) && Array.from(dates).some(date => date < today);
  return { matches, naturallyCrossesToday };
}

function buildScheduleRow(match, tournament, tabName) {
  const source = match.source;
  return {
    time: match.time,
    team1Name: source.team1Name,
    team2Name: source.team2Name,
    team1Score: source.team1Score,
    team2Score: source.team2Score,
    bestOf: source.bestOf,
    winner: source.winner,
    isForfeit: source.isForfeit,
    isFinished: source.winner !== null,
    isLive: source.isLive,
    leagueShort: tournament.leagueShort,
    slug: tournament.slug,
    tournamentIndex: tournament.tournamentIndex,
    tabName,
    timestamp: match.timestamp
  };
}

function appendSelectedSessions(rowsByDate, artifact, carryover, tournament, today, nowTimestamp) {
  assertScheduleCarryoverReferences(carryover, artifact, new Date(nowTimestamp));
  const activeCarryoverKeys = collectActiveCarryoverKeys(carryover.entries, nowTimestamp);
  for (const session of artifact.sessions) {
    const { tab } = parseScheduleSessionKey(session.sessionKey, `ScheduleSessions.${tournament.slug}.${session.sessionKey}`);
    const { matches, naturallyCrossesToday } = readSessionMatches(session, today);
    const retainPastMatches = naturallyCrossesToday || activeCarryoverKeys.has(session.sessionKey);
    for (const match of matches) {
      if (match.date < today && !retainPastMatches) continue;
      if (!rowsByDate.has(match.date)) rowsByDate.set(match.date, []);
      rowsByDate.get(match.date).push(buildScheduleRow(match, tournament, tab));
    }
  }
}

function buildScheduleMap(rowsByDate, maxDays) {
  const scheduleMap = {};
  const dates = Array.from(rowsByDate.keys()).sort().slice(0, maxDays);
  for (const date of dates) {
    scheduleMap[date] = rowsByDate.get(date).sort((left, right) => {
      if (left.tournamentIndex !== right.tournamentIndex) {
        return left.tournamentIndex - right.tournamentIndex;
      }
      return left.timestamp - right.timestamp;
    });
  }
  return scheduleMap;
}

export function selectHomeSchedule(scheduleSessionsMap, carryoverMap, tournaments, now, maxDays) {
  if (!Number.isInteger(maxDays) || maxDays < 1) throw new Error("maxDays must be a positive integer");
  const nowTimestamp = readNowTimestamp(now);
  const today = timePolicy.getAppDateKey(nowTimestamp);
  const orderedTournaments = readTournaments(tournaments);
  const tournamentSlugs = new Set(orderedTournaments.map(tournament => tournament.slug));
  assertMapScope(scheduleSessionsMap, "scheduleSessionsMap", tournamentSlugs);
  assertMapScope(carryoverMap, "carryoverMap", tournamentSlugs);

  const rowsByDate = new Map();
  for (const tournament of orderedTournaments) {
    const scheduleSessions = readStoreValue(
      scheduleSessionsMap,
      tournament.slug,
      "sessions",
      "ScheduleSessions",
      assertScheduleSessionsFields
    );
    const scheduleCarryover = readStoreValue(
      carryoverMap,
      tournament.slug,
      "entries",
      "ScheduleCarryover",
      assertScheduleCarryoverFields
    );
    appendSelectedSessions(rowsByDate, scheduleSessions, scheduleCarryover, tournament, today, nowTimestamp);
  }
  return buildScheduleMap(rowsByDate, maxDays);
}
