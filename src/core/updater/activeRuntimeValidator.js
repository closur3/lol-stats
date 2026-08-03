import { readRawMatches } from "../facts/rawMatchesStore.js";
import { readScheduleSessions } from "../facts/scheduleSessionsStore.js";
import { readScheduleState } from "../scheduler/scheduleState.js";
import { readActiveHomes } from "./activeHomeReader.js";
import { assertScheduleRuntimeScope } from "../scheduler/scheduleRuntime.js";

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

export async function assertActiveRuntimeMatchesConfig(env, activeTournaments) {
  const activeSlugs = activeTournaments.map(tournament => tournament.slug);
  const [activeHomes, sessionsBySlug, scheduleState] = await Promise.all([
    readActiveHomes(env, activeTournaments),
    assertActiveFactsAvailable(env, activeSlugs),
    readScheduleState(env)
  ]);
  assertScheduleRuntimeScope({
    scheduleState,
    scheduleSessionsBySlug: new Map([...sessionsBySlug].map(([slug, value]) => [slug, { sessions: value.sessions }]))
  }, activeTournaments);

  if (activeHomes.length !== activeTournaments.length) throw new Error("ActiveHome count does not match TournamentConfig.active");
}
