import { runBaselineTick } from "../../core/cron/orchestrator.js";
import { readCronInfo } from "../../core/scheduler/cronInfo.js";
import { requireAdmin, requirePost } from "./auth.js";
import { actionResultResponse } from "./actionResultResponse.js";

export async function handleRunCron(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    await runBaselineTick(env, Date.now());
    const cronInfo = await readCronInfo(env);
    return actionResultResponse("Cron completed.", cronInfo);
  } catch (error) {
    console.error(`[CRON:ERROR] ${error.stack || error.message}`);
    return new Response(`Cron Error: ${error.message}`, { status: 500 });
  }
}
