import { buildActiveBucketCronsFromState, shouldRunPlaySlugAt } from "./cronBuckets.js";
import {
  assertSlugScheduleState,
  readScheduleState
} from "./scheduleState.js";
import { timePolicy } from "../../utils/timePolicy.js";

export async function resolveScheduledExecutionSlugs(env, scheduledTimeMs, eventCron) {
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getBusinessDateKey(now);
  const state = await readScheduleState(env);
  if (!state || state.date !== today) {
    return { type: 'all' };
  }

  const activeCrons = new Set(buildActiveBucketCronsFromState(state, now));
  if (!activeCrons.has(eventCron)) {
    return { type: 'all' };
  }

  const slugs = new Set();
  for (const [slug, slugState] of Object.entries(state.slugStates)) {
    assertSlugScheduleState(slug, slugState);
    if (shouldRunPlaySlugAt(slugState, now)) slugs.add(slug);
  }

  if (slugs.size === 0) return { type: 'none' };
  return { type: 'scoped', slugs };
}
