import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { collectSchedulesFromState } from "../scheduler/cronBuckets.js";
import { runScheduleApply } from "../scheduler/scheduleApplyRunner.js";
import {
  areSchedulesApplied,
  readScheduleControl,
  recordAppliedSchedules,
  writeScheduleControl
} from "../scheduler/scheduleState.js";
import { removeActiveTournament } from "./activeTournamentRegistry.js";

function normalizeSlug(slug) {
  if (typeof slug !== "string" || !slug.trim()) {
    throw new Error("Active tournament slug required");
  }
  return slug.trim();
}

async function deleteActiveRuntimeFacts(env, slug) {
  const kv = env["lol-stats-kv"];
  await Promise.all([
    kv.delete(kvKeys.home(slug)),
    kv.delete(kvKeys.log(slug)),
    kv.delete(kvKeys.rev(slug)),
    kv.delete(kvKeys.rawMatches(slug)),
    kv.delete(kvKeys.scheduleMeta(slug))
  ]);
}

async function deleteActiveRuntimeScheduleState(env, slug, scheduleOptions) {
  const state = await readScheduleControl(env);
  if (!state) return;
  const controlChanged = Object.prototype.hasOwnProperty.call(state.leagues, slug);
  if (controlChanged) delete state.leagues[slug];

  const schedules = collectSchedulesFromState(state);
  let appliedChanged = false;
  if (!areSchedulesApplied(state, schedules)) {
    const applied = await runScheduleApply(env, schedules, "DELETE_ACTIVE", scheduleOptions);
    if (applied) {
      recordAppliedSchedules(state, schedules);
      appliedChanged = true;
    }
  }
  if (controlChanged || appliedChanged) await writeScheduleControl(env, state);
}

export async function deleteActiveRuntimeState(env, slug, options = {}) {
  const cleanSlug = normalizeSlug(slug);
  await deleteActiveRuntimeFacts(env, cleanSlug);
  await removeActiveTournament(env, cleanSlug);
  await deleteActiveRuntimeScheduleState(
    env,
    cleanSlug,
    options.scheduleOptions ?? {}
  );

  return { deletedSlug: cleanSlug };
}
