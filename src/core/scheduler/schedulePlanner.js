import {
  buildWindowFromMeta,
  fetchTournamentMetasFromScheduleMeta
} from "./scheduleDiscovery.js";
import {
  alignStateLeaguesWithTournaments,
  buildIdleState,
  buildLeagueState,
  derivePhase,
  readControl,
  syncPhaseByWindowAndMeta,
  writeControl
} from "./scheduleState.js";
import { ensureSchedulesApplied, writeStateAndSchedules } from "./scheduleWriter.js";
import { timePolicy } from "../../utils/timePolicy.js";

function requireMeta(metasBySlug, slug) {
  const meta = metasBySlug.get(slug);
  if (!meta) throw new Error(`SCHEDULE_META missing after load: ${slug}`);
  return meta;
}

export async function planTodayPlay(env, tournaments, scheduledTimeMs, options = {}) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getBusinessDateKey(now);
  const metas = await fetchTournamentMetasFromScheduleMeta(env, tournaments);
  const metasBySlug = new Map(metas.map(meta => [meta.slug, meta]));
  const next = buildIdleState(today, tournaments);

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    const meta = requireMeta(metasBySlug, slug);
    const window = buildWindowFromMeta(meta);
    if (!window) continue;
    const candidate = buildLeagueState("idle", window);
    candidate.phase = derivePhase(candidate, meta, now);
    next.leagues[slug] = candidate;
  }

  await writeStateAndSchedules(env, next, now, "PLAN", options);
}

export async function ensureDayInitialized(env, tournaments, scheduledTimeMs, options = {}) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getBusinessDateKey(now);
  const state = await readControl(env);
  if (state?.date !== today) {
    await planTodayPlay(env, tournaments, scheduledTimeMs, options);
    return true;
  }

  const aligned = alignStateLeaguesWithTournaments(state, tournaments);
  const metas = await fetchTournamentMetasFromScheduleMeta(env, tournaments);
  const metasBySlug = new Map(metas.map(meta => [meta.slug, meta]));
  const phaseChanged = syncPhaseByWindowAndMeta(state, metasBySlug, now);
  if (aligned) {
    await writeStateAndSchedules(env, state, now, "ALIGN", options);
    return false;
  }
  if (phaseChanged.length > 0) {
    await writeControl(env, state);
    console.log(`[SCHED:PHASE] date=${today} ${phaseChanged.join(",")}`);
  }
  await ensureSchedulesApplied(env, state, now, options);
  return false;
}
