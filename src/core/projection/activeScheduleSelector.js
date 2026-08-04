import { timePolicy } from "../../utils/timePolicy.js";
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
  const names = new Set();
  return tournaments.map((tournament, tournamentIndex) => {
    const label = `tournaments[${tournamentIndex}]`;
    requireObject(tournament, label);
    if (typeof tournament.name !== "string" || tournament.name.trim() === "") {
      throw new Error(`${label}.name must be a string`);
    }
    if (typeof tournament.leagueShort !== "string" || tournament.leagueShort.trim() === "") {
      throw new Error(`${label}.leagueShort must be a string`);
    }
    if (names.has(tournament.name)) throw new Error(`Duplicate tournament name: ${tournament.name}`);
    names.add(tournament.name);
    return {
      name: tournament.name,
      leagueShort: tournament.leagueShort,
      tournamentIndex
    };
  });
}

function assertMapScope(value, label, tournamentNames) {
  if (!(value instanceof Map)) throw new Error(`${label} must be a Map`);
  for (const tournamentName of value.keys()) {
    if (!tournamentNames.has(tournamentName)) throw new Error(`${label} contains unexpected tournamentName: ${String(tournamentName)}`);
  }
  for (const tournamentName of tournamentNames) {
    if (!value.has(tournamentName)) throw new Error(`${label} missing tournamentName: ${tournamentName}`);
  }
}

function readStoreValue(map, tournamentName, field, artifactName, assertArtifactFields) {
  const stored = map.get(tournamentName);
  const label = `${artifactName}.${tournamentName}`;
  assertFields(stored, ["tournamentName", field], label);
  if (stored.tournamentName !== tournamentName) throw new Error(`${label}.tournamentName must match ${tournamentName}`);
  return assertArtifactFields(label, { [field]: stored[field] });
}

function readSessionMatches(session) {
  const matches = session.matches.map(match => {
    const dateTime = timePolicy.getCurrentAppDateTime(match.scheduledAt);
    return {
      source: match,
      date: dateTime.dateString,
      time: dateTime.timeString.slice(0, 5),
      timestamp: dateTime.timestamp
    };
  });
  return matches;
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
    tournamentName: tournament.name,
    tournamentIndex: tournament.tournamentIndex,
    tabName,
    timestamp: match.timestamp
  };
}

function isCurrentSession(matches, today) {
  return matches.some(match => match.date === today || (match.date < today && match.source.winner === null));
}

function appendSelectedSessions(rowsByDate, artifact, tournament, today) {
  for (const session of artifact.sessions) {
    const { tab } = parseScheduleSessionKey(session.sessionKey, `ScheduleSessions.${tournament.name}.${session.sessionKey}`);
    const matches = readSessionMatches(session);
    const currentSession = isCurrentSession(matches, today);
    for (const match of matches) {
      if (match.date < today && !currentSession) continue;
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

export function selectActiveSchedule(scheduleSessionsMap, tournaments, now, maxDays) {
  if (!Number.isInteger(maxDays) || maxDays < 1) throw new Error("maxDays must be a positive integer");
  const nowTimestamp = readNowTimestamp(now);
  const today = timePolicy.getAppDateKey(nowTimestamp);
  const orderedTournaments = readTournaments(tournaments);
  const tournamentNames = new Set(orderedTournaments.map(tournament => tournament.name));
  assertMapScope(scheduleSessionsMap, "scheduleSessionsMap", tournamentNames);

  const rowsByDate = new Map();
  for (const tournament of orderedTournaments) {
    const scheduleSessions = readStoreValue(
      scheduleSessionsMap,
      tournament.name,
      "sessions",
      "ScheduleSessions",
      assertScheduleSessionsFields
    );
    appendSelectedSessions(rowsByDate, scheduleSessions, tournament, today);
  }
  return buildScheduleMap(rowsByDate, maxDays);
}
