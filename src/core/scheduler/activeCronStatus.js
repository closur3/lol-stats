import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { baselineCron } from './cronBuckets.js';

export async function readHasActiveCron(env) {
  const state = await env["lol-stats-kv"].get(kvKeys.scheduleState(), { type: "json" });
  return Array.isArray(state?.appliedCrons) && state.appliedCrons.some(cron => cron !== baselineCron);
}
