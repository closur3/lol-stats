import { deleteActiveRuntimeState } from "../../core/updater/activeTournamentDeletion.js";
import { resolveScheduleOptions } from "../../core/scheduler/scheduleOptions.js";
import { requireAdmin, requirePost } from "./auth.js";
import { readJsonPayload } from "./requestPayload.js";
import { readHasActiveCron } from "../../core/scheduler/activeCronStatus.js";
import { actionResultResponse } from "./actionResultResponse.js";

export async function handleDeleteActive(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const payload = await readJsonPayload(request);
  if (!payload) return new Response("Invalid JSON payload", { status: 400 });

  try {
    const scheduleWarnings = [];
    const result = await deleteActiveRuntimeState(
      env,
      payload.slug,
      resolveScheduleOptions(env, { applySchedules: "best-effort", scheduleWarnings })
    );
    const hasActiveCron = await readHasActiveCron(env);
    if (scheduleWarnings.length > 0) {
      return actionResultResponse(`Deleted active runtime state with schedule warnings: ${scheduleWarnings.join(" | ")}`, hasActiveCron, 207);
    }
    return actionResultResponse(`Deleted active runtime state: ${result.deletedSlug}`, hasActiveCron);
  } catch (error) {
    return new Response(`Delete Active Runtime State Error: ${error.message}`, { status: 500 });
  }
}
