import { analyzeTournaments } from "../analyzer.js";
import { readRawMatches } from "../facts/rawMatchesStore.js";
import { buildHomeSnapshots, writeHomeSnapshots } from "../projection/homeProjector.js";
import { inspectActiveHomes } from "./activeHomeReader.js";

export async function repairActiveHomeProjections(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const entries = await inspectActiveHomes(env, tournaments);
  const targets = tournaments.filter((_tournament, index) => entries[index].issue);
  if (targets.length === 0) return;

  const rawMatchesBySlug = Object.fromEntries(await Promise.all(targets.map(async tournament => [
    tournament.slug,
    await readRawMatches(env, tournament.slug)
  ])));
  const analysis = analyzeTournaments(rawMatchesBySlug, targets);
  const targetSlugs = new Set(targets.map(tournament => tournament.slug));
  const snapshotsBySlug = buildHomeSnapshots(targets, analysis, targetSlugs);
  await writeHomeSnapshots(env, snapshotsBySlug);
  console.log(`[ACTIVE:PROJECTION] repaired=${[...targetSlugs].join(",")}`);
}
