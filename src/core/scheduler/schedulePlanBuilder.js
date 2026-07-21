import {
  advanceTrackedSessionKeys,
  buildScheduleDayFacts,
  deriveCronWindow
} from "./scheduleDay.js";
import { timePolicy } from "../../utils/timePolicy.js";

function requireScheduleSessions(sessionsBySlug, slug) {
  const scheduleSessions = sessionsBySlug.get(slug);
  if (!scheduleSessions) throw new Error(`ScheduleSessions missing after load: ${slug}`);
  return scheduleSessions;
}

function buildScheduleControl(scheduleSessions, previousControl, sameDate, now) {
  const facts = buildScheduleDayFacts(scheduleSessions, now);
  const trackedSessionKeys = advanceTrackedSessionKeys(
    facts,
    previousControl?.trackedSessionKeys || [],
    sameDate
  );
  return {
    cronWindow: deriveCronWindow(facts, trackedSessionKeys),
    trackedSessionKeys
  };
}

export function buildScheduleState(tournaments, sessionsBySlug, nowInput, previousState = null) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  if (!(sessionsBySlug instanceof Map)) throw new Error("sessionsBySlug must be a Map");
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduler timestamp: ${nowInput}`);
  const date = timePolicy.getAppDateKey(now);
  const sameDate = previousState?.date === date;
  const controlsBySlug = {};

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    controlsBySlug[slug] = buildScheduleControl(
      requireScheduleSessions(sessionsBySlug, slug),
      previousState?.controlsBySlug?.[slug] || null,
      sameDate,
      now
    );
  }

  if (sessionsBySlug.size !== tournaments.length) throw new Error("ScheduleSessions scope does not match tournaments");
  return {
    date,
    controlsBySlug,
    appliedCrons: [...(previousState?.appliedCrons || [])]
  };
}
