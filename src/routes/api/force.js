import { runScheduleMaintenance } from "../../core/scheduler/scheduleMaintenanceRunner.js";
import { resolveScheduleOptions } from "../../core/scheduler/scheduleOptions.js";
import { readActiveConfig } from "../../core/facts/tournamentConfigReader.js";
import { readExistingRawMatchesBySlug } from "../../core/facts/rawMatchesStore.js";
import { runActiveUpdate } from "../../core/updater/activeUpdateRunner.js";
import { detectRevisionChanges } from "../../core/updater/revisionDetector.js";
import { requireAdmin } from "./auth.js";

function parseForceSlugs(body) {
  if (!body || !Array.isArray(body.slugs)) return null;
  const cleanSlugs = body.slugs
    .filter(slug => typeof slug === "string")
    .map(slug => slug.trim())
    .filter(Boolean);
  return cleanSlugs.length > 0 ? new Set(cleanSlugs) : null;
}

export async function handleForceUpdate(request, env) {
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    let forceSlugs = null;
    try {
      forceSlugs = parseForceSlugs(await request.json());
      if (!forceSlugs) return new Response("Missing required field: slugs[]", { status: 400 });
    } catch (_error) {
      return new Response("Invalid JSON payload", { status: 400 });
    }

    let tournaments;
    try {
      tournaments = await readActiveConfig(env);
    } catch (error) {
      return new Response(`Config load failed: ${error.message}`, { status: 500 });
    }
    if (!Array.isArray(tournaments)) return new Response("Invalid tournaments config", { status: 500 });

    const now = Date.now();
    const forcedTournaments = tournaments.filter(tournament => forceSlugs.has(tournament.slug));
    if (forcedTournaments.length !== forceSlugs.size) return new Response("Unknown slug in slugs[]", { status: 400 });
    const rawMatchesBySlug = await readExistingRawMatchesBySlug(env, forcedTournaments);
    const { revidChanges, pendingRevisionWrites } = await detectRevisionChanges(env, forcedTournaments);
    await runActiveUpdate(env, tournaments, rawMatchesBySlug, true, forceSlugs, {
      forceWrite: true,
      revidChanges,
      pendingRevisionWrites
    });

    const scheduleWarnings = [];
    const scheduleOptions = resolveScheduleOptions(env, { applySchedules: "best-effort", scheduleWarnings });
    await runScheduleMaintenance(env, tournaments, now, scheduleOptions);
    if (scheduleWarnings.length > 0) {
      return new Response(`PARTIAL scheduleWarnings=${scheduleWarnings.join(" | ")}`, { status: 207 });
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response(`Worker Error: ${error.message}`, { status: 500 });
  }
}
