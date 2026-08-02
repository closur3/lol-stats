import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { rebuildSchedule } from "../scheduler/scheduleMaintenanceRunner.js";
import { runActiveUpdate } from "./activeUpdateRunner.js";

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

    try {
      const rawMatches = await kv.get(kvKeys.rawMatches(slug), { type: "json" });
      if (!Array.isArray(rawMatches)) {
        const state = rawMatches === null ? "missing" : "invalid";
        console.log(`[FORCE:REPAIR] ${state} RawMatches ${slug}`);
        rawMatchesBySlug[slug] = null;
        rebuildSlugs.add(slug);
        return;
      }
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
  await runActiveUpdate(env, activeTournaments, rawMatchesBySlug, rebuildSlugs, {
    reasonsBySlug,
    rebuild: true
  });
  await rebuildSchedule(env, activeTournaments, scheduledTimeMs, scheduleOptions);
}
