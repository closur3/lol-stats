import { timePolicy } from "../../utils/timePolicy.js";
import { assertScheduleCarryoverFields } from "../facts/scheduleCarryoverStore.js";
import { assertScheduleSessionsFields } from "../facts/scheduleSessionsStore.js";

function readNow(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("now must be a valid Date");
  }
  const timestamp = now.getTime();
  if (!Number.isInteger(timestamp) || timestamp < 1) {
    throw new Error("now timestamp must be a positive integer");
  }
  return timestamp;
}

function readPrevious(previousOrNull) {
  if (previousOrNull === null) return { entries: [] };
  return assertScheduleCarryoverFields("ScheduleCarryover.previous", previousOrNull);
}

function collectMatchDates(matches) {
  return new Set(matches.map(match => timePolicy.getAppDateKey(match.scheduledAt)));
}

function isCarryoverSession(session, nowTimestamp) {
  const matchDates = collectMatchDates(session.matches);
  if (matchDates.size !== 1) return false;
  const carryoverStartsAt = timePolicy.getNextAppDateStartTimestamp(session.matches[0].scheduledAt);
  const carryoverExpiresAt = timePolicy.getNextAppDateStartTimestamp(carryoverStartsAt);
  if (nowTimestamp < carryoverStartsAt || nowTimestamp >= carryoverExpiresAt) return false;
  return session.matches.some(match => match.winner === null);
}

function assertCarryoverWindow(entry, session) {
  if (collectMatchDates(session.matches).size !== 1) {
    throw new Error(`ScheduleCarryover session must be single-day: ${entry.sessionKey}`);
  }
  const startsAt = timePolicy.getNextAppDateStartTimestamp(session.matches[0].scheduledAt);
  const expiresAt = timePolicy.getNextAppDateStartTimestamp(startsAt);
  if (entry.observedAt < startsAt || entry.observedAt >= expiresAt || entry.expiresAt !== expiresAt) {
    throw new Error(`ScheduleCarryover entry is outside its session carryover day: ${entry.sessionKey}`);
  }
}

export function assertScheduleCarryoverReferences(scheduleCarryover, scheduleSessions, now) {
  const nowTimestamp = readNow(now);
  const currentCarryover = readPrevious(scheduleCarryover);
  const currentSessions = assertScheduleSessionsFields("ScheduleSessions", scheduleSessions);
  const sessionsByKey = new Map(currentSessions.sessions.map(session => [session.sessionKey, session]));
  for (const entry of currentCarryover.entries) {
    if (entry.expiresAt <= nowTimestamp) continue;
    const session = sessionsByKey.get(entry.sessionKey);
    if (!session) {
      throw new Error(`Unexpired ScheduleCarryover session missing: ${entry.sessionKey}`);
    }
    assertCarryoverWindow(entry, session);
  }
}

export function buildScheduleCarryover(previousOrNull, scheduleSessions, now) {
  const nowTimestamp = readNow(now);
  const previous = readPrevious(previousOrNull);
  const current = assertScheduleSessionsFields("ScheduleSessions", scheduleSessions);
  const sessionsByKey = new Map(current.sessions.map(session => [session.sessionKey, session]));

  const entriesByKey = new Map();
  for (const entry of previous.entries) {
    if (entry.expiresAt <= nowTimestamp) continue;
    const session = sessionsByKey.get(entry.sessionKey);
    if (!session) {
      throw new Error(`Unexpired ScheduleCarryover session missing: ${entry.sessionKey}`);
    }
    assertCarryoverWindow(entry, session);
    entriesByKey.set(entry.sessionKey, entry);
  }

  const expiresAt = timePolicy.getNextAppDateStartTimestamp(now);
  for (const session of current.sessions) {
    if (entriesByKey.has(session.sessionKey)) continue;
    if (!isCarryoverSession(session, nowTimestamp)) continue;
    entriesByKey.set(session.sessionKey, {
      sessionKey: session.sessionKey,
      observedAt: nowTimestamp,
      expiresAt
    });
  }

  const entries = [...entriesByKey.keys()].sort().map(sessionKey => entriesByKey.get(sessionKey));
  return assertScheduleCarryoverFields("ScheduleCarryover", { entries });
}
