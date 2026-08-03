import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertRawMatches } from "../facts/rawMatchesStore.js";
import { rebuildSchedule } from "../scheduler/scheduleMaintenanceRunner.js";
import { prepareActiveUpdate } from "./activeUpdatePreparer.js";
import { detectRevisionChanges } from "./revisionDetector.js";
import { commitRevisionWrites } from "./revWriter.js";
import { commitActiveLogWrites } from "./logPersistence.js";
import { commitActiveUpdate } from "./activeUpdateCommitter.js";
import { rejectActiveUpdate } from "./activeUpdateRejection.js";

function assertForceInputs(activeTournaments, requestedSlugs) {
  if (!Array.isArray(activeTournaments)) throw new Error("activeTournaments must be an array");
  if (!(requestedSlugs instanceof Set) || requestedSlugs.size === 0) {
    throw new Error("requestedSlugs must be a nonempty Set");
  }
  for (const slug of requestedSlugs) {
    if (typeof slug !== "string" || !slug) throw new Error("Force slug missing");
  }
}

async function inspectRawMatches(env, activeTournaments, requestedSlugs) {
  const kv = env["lol-stats-kv"];
  const rawMatchesBySlug = {};
  const rebuildSlugs = new Set(requestedSlugs);

  await Promise.all(activeTournaments.map(async tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    if (requestedSlugs.has(slug)) {
      rawMatchesBySlug[slug] = null;
      return;
    }

    let stored;
    try {
      stored = await kv.get(kvKeys.rawMatches(slug));
    } catch (error) {
      throw new Error(`Force RawMatches read failed: ${slug}`, { cause: error });
    }
    if (stored === null) {
      console.log(`[FORCE:REPAIR] missing RawMatches ${slug}`);
      rawMatchesBySlug[slug] = null;
      rebuildSlugs.add(slug);
      return;
    }

    try {
      const rawMatches = typeof stored === "string" ? JSON.parse(stored) : stored;
      assertRawMatches(slug, rawMatches);
      rawMatchesBySlug[slug] = rawMatches;
    } catch (error) {
      console.error(`[FORCE:REPAIR] invalid RawMatches ${slug}: ${error.message}`);
      rawMatchesBySlug[slug] = null;
      rebuildSlugs.add(slug);
    }
  }));

  return { rawMatchesBySlug, rebuildSlugs };
}

export async function forceActiveTournaments(env, activeTournaments, requestedSlugs, scheduledTimeMs, scheduleOptions) {
  assertForceInputs(activeTournaments, requestedSlugs);
  const activeSlugs = new Set(activeTournaments.map(tournament => tournament.slug));
  if (requestedSlugs.size > activeSlugs.size || [...requestedSlugs].some(slug => !activeSlugs.has(slug))) {
    throw new Error("Force scope contains a tournament outside TournamentConfig.active");
  }

  const { rawMatchesBySlug, rebuildSlugs } = await inspectRawMatches(env, activeTournaments, requestedSlugs);
  const reasonsBySlug = new Map([...rebuildSlugs].map(slug => [slug, "force"]));
  const rebuildTournaments = activeTournaments.filter(tournament => rebuildSlugs.has(tournament.slug));
  const { revidChanges, pendingRevisionWrites } = await detectRevisionChanges(env, rebuildTournaments);
  const activeUpdatePlan = await prepareActiveUpdate(env, activeTournaments, rawMatchesBySlug, rebuildSlugs, {
    reasonsBySlug,
    rebuild: true,
    revidChanges
  });
  if (!activeUpdatePlan.accepted) await rejectActiveUpdate(env, activeUpdatePlan);
  await commitActiveUpdate(env, activeUpdatePlan);
  await rebuildSchedule(env, activeTournaments, scheduledTimeMs, scheduleOptions);
  await commitRevisionWrites(env, pendingRevisionWrites);
  await commitActiveLogWrites(env, activeUpdatePlan.activeLogWrites);
}
