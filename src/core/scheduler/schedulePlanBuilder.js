import {
  advanceTrackedSessionKeys,
  buildScheduleDayFacts,
  deriveCronWindow
} from "./scheduleDay.js";
import { timePolicy } from "../../utils/timePolicy.js";

function requireScheduleSessions(sessionsByName, tournamentName) {
  const scheduleSessions = sessionsByName.get(tournamentName);
  if (!scheduleSessions) throw new Error(`ScheduleSessions missing after load: ${tournamentName}`);
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

export function buildScheduleState(tournaments, sessionsByName, nowInput, previousState = null) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  if (!(sessionsByName instanceof Map)) throw new Error("sessionsByName must be a Map");
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduler timestamp: ${nowInput}`);
  const date = timePolicy.getAppDateKey(now);
  const sameDate = previousState?.date === date;
  const controlsByName = {};

  for (const tournament of tournaments) {
    const tournamentName = tournament?.name;
    if (!tournamentName) throw new Error("Tournament tournamentName missing");
    controlsByName[tournamentName] = buildScheduleControl(
      requireScheduleSessions(sessionsByName, tournamentName),
      previousState?.controlsByName?.[tournamentName] || null,
      sameDate,
      now
    );
  }

  if (sessionsByName.size !== tournaments.length) throw new Error("ScheduleSessions scope does not match tournaments");
  return {
    date,
    controlsByName,
    appliedCrons: [...(previousState?.appliedCrons || [])]
  };
}
