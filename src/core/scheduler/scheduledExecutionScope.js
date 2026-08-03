import { buildActiveBucketCronsFromState, shouldRunScheduledSlugAt } from "./cronBuckets.js";
import { assertScheduleRuntimeScope } from "./scheduleRuntime.js";
import { timePolicy } from "../../utils/timePolicy.js";

export function resolveScheduledExecutionScope(scheduleRuntime, tournaments, scheduledTimeMs, eventCron) {
  assertScheduleRuntimeScope(scheduleRuntime, tournaments);
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getAppDateKey(now);
  const state = scheduleRuntime.scheduleState;
  if (state.date !== today) throw new Error(`ScheduleState date mismatch after maintenance: ${state.date} != ${today}`);

  const activeCrons = new Set(buildActiveBucketCronsFromState(state, now));
  if (!activeCrons.has(eventCron)) return { type: "all" };

  const slugs = new Set();
  for (const [slug, control] of Object.entries(state.controlsBySlug)) {
    if (shouldRunScheduledSlugAt(control, now)) slugs.add(slug);
  }
  return slugs.size === 0 ? { type: "none" } : { type: "scoped", slugs };
}
