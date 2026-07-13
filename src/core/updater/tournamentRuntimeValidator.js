import { readRawMatches } from "../facts/rawMatchesStore.js";
import { readScheduleMeta } from "../facts/scheduleMetaStore.js";
import { readActiveHomes } from "./activeHomeReader.js";
import { readArchiveSnapshots } from "./archiveSnapshotReader.js";

const SnapshotTournamentFields = ["slug", "name", "leagueShort", "overviewPage", "startDate", "endDate"];

function assertSnapshotTournament(expected, snapshot, label) {
  const actual = snapshot.tournament;
  const actualFields = Object.keys(actual);
  if (actualFields.length !== SnapshotTournamentFields.length || SnapshotTournamentFields.some(field => !Object.hasOwn(actual, field))) {
    throw new Error(`${label} tournament fields do not match TournamentConfig: ${expected.slug}`);
  }
  for (const field of SnapshotTournamentFields) {
    if (JSON.stringify(actual[field]) !== JSON.stringify(expected[field])) {
      throw new Error(`${label} tournament does not match TournamentConfig: ${expected.slug}`);
    }
  }
}

async function assertActiveFactsAvailable(env, slugs) {
  await Promise.all(slugs.flatMap(slug => [
    readRawMatches(env, slug),
    readScheduleMeta(env, slug)
  ]));
}

export async function assertTournamentRuntimeMatchesConfig(env, config) {
  const activeSlugs = config.active.map(tournament => tournament.slug);
  const archiveSlugs = config.archive.map(tournament => tournament.slug);
  const [activeHomes, archiveSnapshots] = await Promise.all([
    readActiveHomes(env, activeSlugs),
    readArchiveSnapshots(env, archiveSlugs),
    assertActiveFactsAvailable(env, activeSlugs)
  ]);

  config.active.forEach((tournament, index) => {
    assertSnapshotTournament(tournament, activeHomes[index], "ActiveHome");
  });
  config.archive.forEach((tournament, index) => {
    assertSnapshotTournament(tournament, archiveSnapshots[index], "ArchiveSnapshot");
  });
}
