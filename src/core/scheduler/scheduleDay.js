import { assertScheduleSessionsFields } from "../facts/scheduleSessionsStore.js";
import { timePolicy } from "../../utils/timePolicy.js";

function summarizeSession(session, today) {
  const matchDates = new Set();
  let firstTodayTimestamp = null;
  let todayUnfinished = 0;
  let hasHistoryUnfinished = false;

  for (const match of session.matches) {
    const date = timePolicy.getAppDateKey(match.scheduledAt);
    matchDates.add(date);
    if (date === today) {
      firstTodayTimestamp = firstTodayTimestamp === null
        ? match.scheduledAt
        : Math.min(firstTodayTimestamp, match.scheduledAt);
      if (match.winner === null) todayUnfinished++;
    } else if (date < today && match.winner === null) {
      hasHistoryUnfinished = true;
    }
  }

  return {
    sessionKey: session.sessionKey,
    startTimestamp: session.matches[0].scheduledAt,
    matchDates,
    firstTodayTimestamp,
    todayUnfinished,
    hasHistoryUnfinished
  };
}

function compareSessions(left, right) {
  return left.startTimestamp - right.startTimestamp
    || left.sessionKey.localeCompare(right.sessionKey);
}

function selectCurrentSessionKeys(facts) {
  return facts.sessions
    .filter(session => session.matchDates.has(facts.date) || session.hasHistoryUnfinished)
    .map(session => session.sessionKey);
}

function readTrackedSessions(facts, sessionKeys) {
  const sessionsByKey = new Map(facts.sessions.map(session => [session.sessionKey, session]));
  return sessionKeys
    .map(sessionKey => {
      const session = sessionsByKey.get(sessionKey);
      if (!session) throw new Error(`Tracked session missing from ScheduleSessions: ${sessionKey}`);
      return session;
    })
    .sort(compareSessions);
}

function selectPollingSession(sessions) {
  return sessions
    .filter(session => session.todayUnfinished > 0 || session.hasHistoryUnfinished)
    .sort((left, right) => {
      if (left.hasHistoryUnfinished !== right.hasHistoryUnfinished) return left.hasHistoryUnfinished ? -1 : 1;
      const leftTimestamp = left.hasHistoryUnfinished ? left.startTimestamp : left.firstTodayTimestamp;
      const rightTimestamp = right.hasHistoryUnfinished ? right.startTimestamp : right.firstTodayTimestamp;
      return leftTimestamp - rightTimestamp || compareSessions(left, right);
    })[0] || null;
}

function readPollingStartTimestamp(session) {
  if (!session) return null;
  const timestamp = session.hasHistoryUnfinished ? session.startTimestamp : session.firstTodayTimestamp;
  if (!Number.isInteger(timestamp) || timestamp < 1) {
    throw new Error(`Polling session start timestamp missing: ${session.sessionKey}`);
  }
  return timestamp;
}

export function buildScheduleDayFacts(scheduleSessions, nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduler timestamp: ${nowInput}`);
  const { sessions } = assertScheduleSessionsFields("ScheduleSessions", scheduleSessions);
  const date = timePolicy.getAppDateKey(now);
  return {
    date,
    nowTimestamp: now.getTime(),
    sessions: sessions.map(session => summarizeSession(session, date)).sort(compareSessions)
  };
}

export function advanceTrackedSessionKeys(facts, previousSessionKeys = [], sameDate = false) {
  if (!Array.isArray(previousSessionKeys)) throw new Error("previousSessionKeys must be an array");
  const currentKeys = selectCurrentSessionKeys(facts);
  if (!sameDate) return currentKeys;
  const sessionsByKey = new Map(facts.sessions.map(session => [session.sessionKey, session]));
  return Array.from(new Set([
    ...currentKeys,
    ...previousSessionKeys.filter(sessionKey => sessionsByKey.has(sessionKey))
  ])).sort((leftKey, rightKey) => {
    return compareSessions(sessionsByKey.get(leftKey), sessionsByKey.get(rightKey));
  });
}

export function deriveCronWindow(facts, trackedSessionKeys) {
  const pollingSession = selectPollingSession(readTrackedSessions(facts, trackedSessionKeys));
  if (!pollingSession) return null;
  const startHour = pollingSession.hasHistoryUnfinished
    ? 0
    : timePolicy.getAppHour(readPollingStartTimestamp(pollingSession));
  return { startHour, endHour: 23 };
}

export function resolveSchedulePhase(scheduleSessions, nowInput = new Date()) {
  const facts = buildScheduleDayFacts(scheduleSessions, nowInput);
  const currentKeys = selectCurrentSessionKeys(facts);
  const pollingSession = selectPollingSession(readTrackedSessions(facts, currentKeys));
  if (!pollingSession) {
    return facts.sessions.some(session => session.matchDates.has(facts.date)) ? "done" : "offday";
  }
  return facts.nowTimestamp < readPollingStartTimestamp(pollingSession) ? "idle" : "play";
}
