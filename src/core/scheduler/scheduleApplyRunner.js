import { applyCloudflareSchedules } from "./cloudflareSchedules.js";

function recordScheduleApplyFailure(options, reason, error) {
  const message = `${reason}: ${error.message}`;
  if (Array.isArray(options.scheduleWarnings)) options.scheduleWarnings.push(message);
  console.warn(`[SCHED:${reason}] schedule apply failed: ${error.message}`);
}

export async function runScheduleApply(env, schedules, reason, options = {}) {
  if (options.applySchedules === false) return "skipped";

  try {
    await applyCloudflareSchedules(env, schedules);
    return "applied";
  } catch (error) {
    if (options.applySchedules !== "best-effort") throw error;
    recordScheduleApplyFailure(options, reason, error);
    return "failed";
  }
}
