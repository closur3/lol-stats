import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { buildCronsFromScheduleState } from "../scheduler/cronBuckets.js";
import { runScheduleApply } from "../scheduler/scheduleApplyRunner.js";
import {
  areCronsApplied,
  readScheduleState,
  recordAppliedCrons,
  writeScheduleState
} from "../scheduler/scheduleState.js";

function normalizeSlug(slug) {
  if (typeof slug !== "string" || !slug.trim()) {
    throw new Error("Active tournament slug required");
  }
  return slug.trim();
}

export async function deleteActiveRuntimeFacts(env, slug) {
  const cleanSlug = normalizeSlug(slug);
  const kv = env["lol-stats-kv"];
  await Promise.all([
    kv.delete(kvKeys.home(cleanSlug)),
    kv.delete(kvKeys.log(cleanSlug)),
    kv.delete(kvKeys.rev(cleanSlug)),
    kv.delete(kvKeys.rawMatches(cleanSlug)),
    kv.delete(kvKeys.scheduleCarryover(cleanSlug)),
    kv.delete(kvKeys.scheduleSessions(cleanSlug))
  ]);
}

async function deleteActiveRuntimeScheduleState(env, slug, scheduleOptions) {
  const state = await readScheduleState(env);
  if (!state) return;
  const controlChanged = Object.prototype.hasOwnProperty.call(state.controlsBySlug, slug);
  if (controlChanged) delete state.controlsBySlug[slug];

  const schedules = buildCronsFromScheduleState(state);
  let appliedChanged = false;
  if (!areCronsApplied(state, schedules)) {
    const applyResult = await runScheduleApply(env, schedules, "DELETE_ACTIVE", scheduleOptions);
    if (applyResult === "applied") {
      recordAppliedCrons(state, schedules);
      appliedChanged = true;
    }
  }
  if (controlChanged || appliedChanged) await writeScheduleState(env, state);
}

export async function deleteActiveRuntimeState(env, slug, scheduleOptions) {
  const cleanSlug = normalizeSlug(slug);
  if (!scheduleOptions || typeof scheduleOptions !== "object" || Array.isArray(scheduleOptions)) {
    throw new Error("scheduleOptions must be a JSON object");
  }
  await deleteActiveRuntimeFacts(env, cleanSlug);
  await deleteActiveRuntimeScheduleState(env, cleanSlug, scheduleOptions);

  return { deletedSlug: cleanSlug };
}
