import { buildActiveBucketCronsFromState, shouldRunScheduledSlugAt } from "./cronBuckets.js";
import { assertScheduleControl, readScheduleState, ScheduleStateSchemaError } from "./scheduleState.js";
import { timePolicy } from "../../utils/timePolicy.js";

export async function resolveScheduledExecutionScope(env, scheduledTimeMs, eventCron) {
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getAppDateKey(now);
  let state;
  try {
    state = await readScheduleState(env);
  } catch (error) {
    if (!(error instanceof ScheduleStateSchemaError)) throw error;
    console.error(`[SCHED:SCOPE] invalid ScheduleState requires full maintenance: ${error.cause.message}`);
    return { type: "all" };
  }
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
