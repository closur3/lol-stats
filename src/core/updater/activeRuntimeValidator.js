import { readRawMatches } from "../facts/rawMatchesStore.js";
import { readScheduleSessions } from "../facts/scheduleSessionsStore.js";
import { readScheduleState } from "../scheduler/scheduleState.js";
import { readActiveHomes } from "./activeHomeReader.js";

async function assertActiveFactsAvailable(env, slugs) {
  const pairs = await Promise.all(slugs.map(async slug => {
    const [, scheduleSessions] = await Promise.all([
      readRawMatches(env, slug),
      readScheduleSessions(env, slug)
    ]);
    return [slug, scheduleSessions];
  }));
  return new Map(pairs);
}

function assertScheduleStateScope(state, slugs, sessionsBySlug) {
  if (state === null) throw new Error("ScheduleState missing");
  const expectedSlugs = new Set(slugs);
  const actualSlugs = Object.keys(state.controlsBySlug);
  if (actualSlugs.length !== expectedSlugs.size || actualSlugs.some(slug => !expectedSlugs.has(slug))) {
    throw new Error("ScheduleState controls do not match TournamentConfig.active");
  }
  for (const slug of slugs) {
    const sessionKeys = new Set(sessionsBySlug.get(slug).sessions.map(session => session.sessionKey));
    for (const sessionKey of state.controlsBySlug[slug].trackedSessionKeys) {
      if (!sessionKeys.has(sessionKey)) throw new Error(`ScheduleState tracked session missing: ${slug}:${sessionKey}`);
    }
  }
}

export async function assertActiveRuntimeMatchesConfig(env, activeTournaments) {
  const activeSlugs = activeTournaments.map(tournament => tournament.slug);
  const [activeHomes, sessionsBySlug, scheduleState] = await Promise.all([
    readActiveHomes(env, activeTournaments),
    assertActiveFactsAvailable(env, activeSlugs),
    readScheduleState(env)
  ]);
  assertScheduleStateScope(scheduleState, activeSlugs, sessionsBySlug);

  if (activeHomes.length !== activeTournaments.length) throw new Error("ActiveHome count does not match TournamentConfig.active");
}
