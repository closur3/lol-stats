import { readRawMatches } from "../facts/rawMatchesStore.js";
import { readScheduleCarryover } from "../facts/scheduleCarryoverStore.js";
import { readScheduleSessions } from "../facts/scheduleSessionsStore.js";
import { assertScheduleCarryoverReferences } from "../analysis/scheduleCarryover.js";
import { readActiveHomes } from "./activeHomeReader.js";

const SnapshotTournamentFields = ["slug", "name", "leagueShort", "overviewPage", "startDate", "endDate"];

function assertSnapshotTournament(expected, snapshot) {
  const actual = snapshot.tournament;
  const actualFields = Object.keys(actual);
  if (actualFields.length !== SnapshotTournamentFields.length || SnapshotTournamentFields.some(field => !Object.hasOwn(actual, field))) {
    throw new Error(`ActiveHome tournament fields do not match TournamentConfig: ${expected.slug}`);
  }
  for (const field of SnapshotTournamentFields) {
    if (JSON.stringify(actual[field]) !== JSON.stringify(expected[field])) {
      throw new Error(`ActiveHome tournament does not match TournamentConfig: ${expected.slug}`);
    }
  }
}

async function assertActiveFactsAvailable(env, slugs) {
  const now = new Date();
  await Promise.all(slugs.map(async slug => {
    const [, scheduleSessions, carryover] = await Promise.all([
      readRawMatches(env, slug),
      readScheduleSessions(env, slug),
      readScheduleCarryover(env, slug)
    ]);
    assertScheduleCarryoverReferences(
      { entries: carryover.entries },
      { sessions: scheduleSessions.sessions },
      now
    );
  }));
}

export async function assertActiveRuntimeMatchesConfig(env, activeTournaments) {
  const activeSlugs = activeTournaments.map(tournament => tournament.slug);
  const [activeHomes] = await Promise.all([
    readActiveHomes(env, activeSlugs),
    assertActiveFactsAvailable(env, activeSlugs)
  ]);

  activeTournaments.forEach((tournament, index) => {
    assertSnapshotTournament(tournament, activeHomes[index]);
  });
}
