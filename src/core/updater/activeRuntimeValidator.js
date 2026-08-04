import { readRawMatches } from "../facts/rawMatchesStore.js";
import { readScheduleSessions } from "../facts/scheduleSessionsStore.js";
import { readScheduleState } from "../scheduler/scheduleState.js";
import { readActiveSnapshots } from "./activeSnapshotReader.js";
import { assertScheduleRuntimeScope } from "../scheduler/scheduleRuntime.js";

async function assertActiveFactsAvailable(env, names) {
  const pairs = await Promise.all(names.map(async tournamentName => {
    const [, scheduleSessions] = await Promise.all([
      readRawMatches(env, tournamentName),
      readScheduleSessions(env, tournamentName)
    ]);
    return [tournamentName, scheduleSessions];
  }));
  return new Map(pairs);
}

export async function assertActiveRuntimeMatchesConfig(env, activeTournaments) {
  const activeNames = activeTournaments.map(tournament => tournament.name);
  const [activeSnapshots, sessionsByName, scheduleState] = await Promise.all([
    readActiveSnapshots(env, activeTournaments),
    assertActiveFactsAvailable(env, activeNames),
    readScheduleState(env)
  ]);
  assertScheduleRuntimeScope({
    scheduleState,
    scheduleSessionsByName: new Map([...sessionsByName].map(([tournamentName, value]) => [tournamentName, { sessions: value.sessions }]))
  }, activeTournaments);

  if (activeSnapshots.length !== activeTournaments.length) throw new Error("ActiveSnapshot count does not match TournamentConfig.active");
}
