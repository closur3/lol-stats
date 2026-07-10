import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { baselineCron } from './cronBuckets.js';

export async function readHasActiveCron(env) {
  const state = await env["lol-stats-kv"].get(kvKeys.scheduleState(), { type: "json" });
  return Array.isArray(state?.schedules) && state.schedules.some(cron => cron !== baselineCron);
}
