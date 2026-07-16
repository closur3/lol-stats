import { runCron } from "../../core/cron/orchestrator.js";
import { baselineCron } from "../../core/scheduler/cronBuckets.js";
import { readHasActiveCron } from "../../core/scheduler/activeCronStatus.js";
import { requireAdmin, requirePost } from "./auth.js";
import { actionResultResponse } from "./actionResultResponse.js";

export async function handleRunCron(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    await runCron(env, { scheduledTime: Date.now(), cron: baselineCron });
    const hasActiveCron = await readHasActiveCron(env);
    return actionResultResponse("Cron completed.", hasActiveCron);
  } catch (error) {
    console.error(`[CRON:ERROR] ${error.stack || error.message}`);
    return new Response(`Cron Error: ${error.message}`, { status: 500 });
  }
}
