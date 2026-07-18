import { buildActiveBucketCronsFromState, shouldRunScheduledSlugAt } from "./cronBuckets.js";
import { assertScheduleControl, readScheduleState } from "./scheduleState.js";
import { timePolicy } from "../../utils/timePolicy.js";

export async function resolveScheduledExecutionScope(env, scheduledTimeMs, eventCron) {
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getAppDateKey(now);
  const state = await readScheduleState(env);
  if (!state || state.date !== today) return { type: "all" };

  const activeCrons = new Set(buildActiveBucketCronsFromState(state, now));
  if (!activeCrons.has(eventCron)) return { type: "all" };

  const slugs = new Set();
  for (const [slug, control] of Object.entries(state.controlsBySlug)) {
    assertScheduleControl(slug, control);
    if (shouldRunScheduledSlugAt(control, now)) slugs.add(slug);
  }

  if (slugs.size === 0) return { type: "none" };
  return { type: "scoped", slugs };
}
