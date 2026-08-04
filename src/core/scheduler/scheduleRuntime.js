import { assertScheduleControl } from "./scheduleState.js";

export function assertScheduleRuntimeScope(scheduleRuntime, tournaments) {
  if (!scheduleRuntime || typeof scheduleRuntime !== "object" || Array.isArray(scheduleRuntime)) {
    throw new Error("scheduleRuntime must be an object");
  }
  const runtimeFields = Object.keys(scheduleRuntime);
  if (
    runtimeFields.length !== 2
    || !Object.hasOwn(scheduleRuntime, "scheduleState")
    || !Object.hasOwn(scheduleRuntime, "scheduleSessionsByName")
  ) {
    throw new Error("scheduleRuntime fields must be scheduleState and scheduleSessionsByName");
  }
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const { scheduleState, scheduleSessionsByName } = scheduleRuntime;
  if (!scheduleState || typeof scheduleState !== "object" || Array.isArray(scheduleState)) {
    throw new Error("ScheduleState missing from scheduleRuntime");
  }
  if (!scheduleState.controlsByName || typeof scheduleState.controlsByName !== "object" || Array.isArray(scheduleState.controlsByName)) {
    throw new Error("ScheduleState.controlsByName must be an object");
  }
  if (!(scheduleSessionsByName instanceof Map)) {
    throw new Error("scheduleSessionsByName must be a Map");
  }

  const expectedNames = tournaments.map(tournament => {
    const tournamentName = tournament?.name;
    if (!tournamentName) throw new Error("Tournament tournamentName missing");
    return tournamentName;
  });
  const expectedNameSet = new Set(expectedNames);
  if (expectedNameSet.size !== expectedNames.length) throw new Error("Tournament names contain duplicates");
  const controlNames = Object.keys(scheduleState.controlsByName);
  if (controlNames.length !== expectedNames.length || controlNames.some(tournamentName => !expectedNameSet.has(tournamentName))) {
    throw new Error("ScheduleState controls do not match TournamentConfig.active");
  }
  if (scheduleSessionsByName.size !== expectedNames.length || [...scheduleSessionsByName.keys()].some(tournamentName => !expectedNameSet.has(tournamentName))) {
    throw new Error("ScheduleSessions scope does not match TournamentConfig.active");
  }

  for (const tournamentName of expectedNames) {
    const control = assertScheduleControl(tournamentName, scheduleState.controlsByName[tournamentName]);
    const scheduleSessions = scheduleSessionsByName.get(tournamentName);
    if (!scheduleSessions || !Array.isArray(scheduleSessions.sessions)) {
      throw new Error(`ScheduleSessions missing from scheduleRuntime: ${tournamentName}`);
    }
    const sessionKeys = new Set(scheduleSessions.sessions.map(session => session.sessionKey));
    for (const sessionKey of control.trackedSessionKeys) {
      if (!sessionKeys.has(sessionKey)) {
        throw new Error(`ScheduleState tracked session missing: ${tournamentName}:${sessionKey}`);
      }
    }
  }
  return scheduleRuntime;
}
