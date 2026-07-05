import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { collectSchedulesFromState } from "../scheduler/cronBuckets.js";
import { runScheduleApply } from "../scheduler/scheduleApplyRunner.js";
import {
  areSchedulesApplied,
  readScheduleState,
  recordAppliedSchedules,
  writeScheduleState
} from "../scheduler/scheduleState.js";

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
  const state = await readScheduleState(env);
  if (!state) return;
  const controlChanged = Object.prototype.hasOwnProperty.call(state.slugStates, slug);
  if (controlChanged) delete state.slugStates[slug];

  const schedules = collectSchedulesFromState(state);
  let appliedChanged = false;
  if (!areSchedulesApplied(state, schedules)) {
    const applyResult = await runScheduleApply(env, schedules, "DELETE_ACTIVE", scheduleOptions);
    if (applyResult === "applied") {
      recordAppliedSchedules(state, schedules);
      appliedChanged = true;
    }
  }
  if (controlChanged || appliedChanged) await writeScheduleState(env, state);
}

export async function deleteActiveRuntimeState(env, slug, options = {}) {
  const cleanSlug = normalizeSlug(slug);
  await deleteActiveRuntimeFacts(env, cleanSlug);
  await deleteActiveRuntimeScheduleState(
    env,
    cleanSlug,
    options.scheduleOptions ?? {}
  );

  return { deletedSlug: cleanSlug };
}
