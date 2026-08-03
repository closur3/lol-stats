import { assertScheduleControl } from "./scheduleState.js";

export function assertScheduleRuntimeScope(scheduleRuntime, tournaments) {
  if (!scheduleRuntime || typeof scheduleRuntime !== "object" || Array.isArray(scheduleRuntime)) {
    throw new Error("scheduleRuntime must be an object");
  }
  const runtimeFields = Object.keys(scheduleRuntime);
  if (
    runtimeFields.length !== 2
    || !Object.hasOwn(scheduleRuntime, "scheduleState")
    || !Object.hasOwn(scheduleRuntime, "scheduleSessionsBySlug")
  ) {
    throw new Error("scheduleRuntime fields must be scheduleState and scheduleSessionsBySlug");
  }
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const { scheduleState, scheduleSessionsBySlug } = scheduleRuntime;
  if (!scheduleState || typeof scheduleState !== "object" || Array.isArray(scheduleState)) {
    throw new Error("ScheduleState missing from scheduleRuntime");
  }
  if (!scheduleState.controlsBySlug || typeof scheduleState.controlsBySlug !== "object" || Array.isArray(scheduleState.controlsBySlug)) {
    throw new Error("ScheduleState.controlsBySlug must be an object");
  }
  if (!(scheduleSessionsBySlug instanceof Map)) {
    throw new Error("scheduleSessionsBySlug must be a Map");
  }

  const expectedSlugs = tournaments.map(tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    return slug;
  });
  const expectedSlugSet = new Set(expectedSlugs);
  if (expectedSlugSet.size !== expectedSlugs.length) throw new Error("Tournament slugs contain duplicates");
  const controlSlugs = Object.keys(scheduleState.controlsBySlug);
  if (controlSlugs.length !== expectedSlugs.length || controlSlugs.some(slug => !expectedSlugSet.has(slug))) {
    throw new Error("ScheduleState controls do not match TournamentConfig.active");
  }
  if (scheduleSessionsBySlug.size !== expectedSlugs.length || [...scheduleSessionsBySlug.keys()].some(slug => !expectedSlugSet.has(slug))) {
    throw new Error("ScheduleSessions scope does not match TournamentConfig.active");
  }

  for (const slug of expectedSlugs) {
    const control = assertScheduleControl(slug, scheduleState.controlsBySlug[slug]);
    const scheduleSessions = scheduleSessionsBySlug.get(slug);
    if (!scheduleSessions || !Array.isArray(scheduleSessions.sessions)) {
      throw new Error(`ScheduleSessions missing from scheduleRuntime: ${slug}`);
    }
    const sessionKeys = new Set(scheduleSessions.sessions.map(session => session.sessionKey));
    for (const sessionKey of control.trackedSessionKeys) {
      if (!sessionKeys.has(sessionKey)) {
        throw new Error(`ScheduleState tracked session missing: ${slug}:${sessionKey}`);
      }
    }
  }
  return scheduleRuntime;
}
