import { buildActiveBucketCronsFromState, shouldRunPlayLeagueAt } from "./cronBuckets.js";
import {
  assertLeagueState,
  readControl
} from "./scheduleState.js";
import { timePolicy } from "../../utils/timePolicy.js";

export async function resolveScheduledExecutionSlugs(env, scheduledTimeMs, eventCron) {
  const now = new Date(scheduledTimeMs);
  const today = timePolicy.getBusinessDateKey(now);
  const state = await readControl(env);
  if (!state || state.date !== today) {
    return { type: 'all' };
  }

  const activeCrons = new Set(buildActiveBucketCronsFromState(state, now));
  if (!activeCrons.has(eventCron)) {
    return { type: 'all' };
  }

  const slugs = new Set();
  for (const [slug, leagueState] of Object.entries(state.leagues)) {
    assertLeagueState(slug, leagueState);
    if (shouldRunPlayLeagueAt(leagueState, now)) slugs.add(slug);
  }

  if (slugs.size === 0) return { type: 'none' };
  return { type: 'scoped', slugs };
}
