import { timePolicy } from "../../utils/timePolicy.js";
import { rebuildScheduleMetaFromRawMatches } from "../facts/scheduleMetaStore.js";
import { archiveRemovedActiveTournaments } from "../updater/activeTournamentArchiver.js";
import {
  alignStateLeaguesWithTournaments,
  assertLeagueState,
  readScheduleControl
} from "./scheduleState.js";
import { ensureSchedulesApplied, writeStateAndSchedules } from "./scheduleWriter.js";
import { fetchTournamentMetasFromScheduleMeta } from "./scheduleDiscovery.js";
import {
  buildDailyScheduleState,
  buildNextLeagueState,
  requireScheduleMeta
} from "./schedulePlanBuilder.js";

async function rebuildScheduleMetasForTournaments(env, tournaments) {
  return Promise.all(
    tournaments.map(async (tournament) => {
      const slug = tournament?.slug;
      if (!slug) throw new Error("Tournament slug missing");
      return rebuildScheduleMetaFromRawMatches(env, slug);
    })
  );
}

async function planNewScheduleDay(env, tournaments, now, lastDay, options) {
  const rebuiltMetas = await rebuildScheduleMetasForTournaments(env, tournaments);
  const metasBySlug = new Map(rebuiltMetas.map(meta => [meta.slug, meta]));
  const today = timePolicy.getBusinessDateKey(now);
  console.log(`[SCHED:DAY] ${lastDay || "none"} -> ${today}`);
  await writeStateAndSchedules(env, buildDailyScheduleState(tournaments, metasBySlug, now), now, "PLAN", options);
}

async function reconcileCurrentScheduleDay(env, tournaments, state, now, options) {
  const alignmentChanged = alignStateLeaguesWithTournaments(state, tournaments);
  const metas = await fetchTournamentMetasFromScheduleMeta(env, tournaments);
  const metasBySlug = new Map(metas.map(meta => [meta.slug, meta]));
  const reconciled = [];

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    const leagueState = state.leagues[slug];
    assertLeagueState(slug, leagueState);

    const nextLeagueState = buildNextLeagueState(slug, leagueState, requireScheduleMeta(metasBySlug, slug), now);
    if (JSON.stringify(leagueState) !== JSON.stringify(nextLeagueState)) {
      state.leagues[slug] = nextLeagueState;
      reconciled.push(`${slug}:${leagueState.phase}->${nextLeagueState.phase}`);
    }
  }

  const hasChanges = alignmentChanged || reconciled.length > 0;
  if (!hasChanges) {
    await ensureSchedulesApplied(env, state, now, options);
    return;
  }

  if (reconciled.length > 0) {
    const today = timePolicy.getBusinessDateKey(now);
    console.log(`[SCHED:STATE] date=${today} ${reconciled.join(",")}`);
  }

  await writeStateAndSchedules(env, state, now, "RECONCILE", options);
}

export async function runScheduleMaintenance(env, tournaments, scheduledTimeMs, options = {}) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getBusinessDateKey(now);
  await archiveRemovedActiveTournaments(env, tournaments);

  const state = await readScheduleControl(env);
  const lastDay = state?.date || null;

  if (lastDay !== today) {
    await planNewScheduleDay(env, tournaments, now, lastDay, options);
    return;
  }

  await reconcileCurrentScheduleDay(env, tournaments, state, now, options);
}
