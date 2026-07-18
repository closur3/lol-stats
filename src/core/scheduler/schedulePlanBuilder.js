import { timePolicy } from "../../utils/timePolicy.js";
import { assertScheduleSessionsFields } from "../facts/scheduleSessionsStore.js";

function requireScheduleSessions(sessionsBySlug, slug) {
  const scheduleSessions = sessionsBySlug.get(slug);
  if (!scheduleSessions) throw new Error(`ScheduleSessions missing after load: ${slug}`);
  return scheduleSessions;
}

function summarizeSession(session) {
  const startTimestamp = session.matches[0].scheduledAt;
  const matchDates = new Set();
  let unfinished = false;
  for (const match of session.matches) {
    matchDates.add(timePolicy.getAppDateKey(match.scheduledAt));
    if (match.winner === null) unfinished = true;
  }
  return {
    sessionKey: session.sessionKey,
    startTimestamp,
    matchDates,
    unfinished
  };
}

function buildSessionReference(session) {
  if (!session) return null;
  return {
    sessionKey: session.sessionKey,
    startTimestamp: session.startTimestamp
  };
}

export function deriveScheduleControl(scheduleSessions, nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduler timestamp: ${nowInput}`);
  const { sessions } = assertScheduleSessionsFields("ScheduleSessions", scheduleSessions);
  const summaries = sessions.map(summarizeSession);
  const today = timePolicy.getAppDateKey(now);
  const target = summaries.find(session => session.unfinished) || null;
  const hasMatchesToday = summaries.some(session => session.matchDates.has(today));

  if (!target) {
    return {
      phase: hasMatchesToday ? "done" : "offday",
      targetSession: null,
      cronWindow: null
    };
  }

  const targetDate = timePolicy.getAppDateKey(target.startTimestamp);
  if (targetDate > today) {
    return {
      phase: hasMatchesToday ? "done" : "offday",
      targetSession: buildSessionReference(target),
      cronWindow: null
    };
  }

  const startHour = targetDate < today ? 0 : timePolicy.getAppHour(target.startTimestamp);
  return {
    phase: now.getTime() < target.startTimestamp ? "idle" : "play",
    targetSession: buildSessionReference(target),
    cronWindow: { startHour, endHour: 23 }
  };
}

export function resolveSchedulePhase(scheduleSessions, nowInput = new Date()) {
  return deriveScheduleControl(scheduleSessions, nowInput).phase;
}

export function buildScheduleState(tournaments, sessionsBySlug, nowInput, appliedCrons = []) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  if (!(sessionsBySlug instanceof Map)) throw new Error("sessionsBySlug must be a Map");
  if (!Array.isArray(appliedCrons)) throw new Error("appliedCrons must be an array");
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduler timestamp: ${nowInput}`);
  const controlsBySlug = {};
  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    controlsBySlug[slug] = deriveScheduleControl(requireScheduleSessions(sessionsBySlug, slug), now);
  }
  if (sessionsBySlug.size !== tournaments.length) throw new Error("ScheduleSessions scope does not match tournaments");
  return {
    date: timePolicy.getAppDateKey(now),
    controlsBySlug,
    appliedCrons: [...appliedCrons]
  };
}
