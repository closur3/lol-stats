import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { readControl } from "../scheduler/scheduleState.js";
import { ensureSchedulesApplied } from "../scheduler/scheduleWriter.js";

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

async function deleteActiveRuntimeScheduleState(env, slug, nowMs, scheduleOptions) {
  const state = await readControl(env);
  if (!state) return false;
  if (Object.prototype.hasOwnProperty.call(state.leagues, slug)) {
    delete state.leagues[slug];
  }
  return ensureSchedulesApplied(env, state, new Date(nowMs), scheduleOptions);
}

export async function deleteActiveRuntimeState(env, slug, options = {}) {
  const cleanSlug = normalizeSlug(slug);
  await deleteActiveRuntimeFacts(env, cleanSlug);
  const scheduleChanged = await deleteActiveRuntimeScheduleState(
    env,
    cleanSlug,
    options.nowMs ?? Date.now(),
    options.scheduleOptions ?? {}
  );

  return { deletedSlug: cleanSlug, scheduleChanged };
}
