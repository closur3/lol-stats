import { analyzeTournaments } from "../analyzer.js";
import { readRawMatches } from "../facts/rawMatchesStore.js";
import { buildActiveSnapshots, writeActiveSnapshots } from "../projection/activeProjector.js";
import { inspectActiveSnapshots } from "./activeSnapshotReader.js";

export async function repairActiveSnapshotProjections(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const entries = await inspectActiveSnapshots(env, tournaments);
  const targets = tournaments.filter((_tournament, index) => entries[index].issue);
  if (targets.length === 0) return;

  const rawMatchesByName = Object.fromEntries(await Promise.all(targets.map(async tournament => [
    tournament.name,
    await readRawMatches(env, tournament.name)
  ])));
  const analysis = analyzeTournaments(rawMatchesByName, targets);
  const targetNames = new Set(targets.map(tournament => tournament.name));
  const snapshotsByName = buildActiveSnapshots(targets, analysis, targetNames);
  await writeActiveSnapshots(env, snapshotsByName);
  console.log(`[ACTIVE:PROJECTION] repaired=${[...targetNames].join(",")}`);
}
