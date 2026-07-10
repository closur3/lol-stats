import { deleteActiveRuntimeState } from "../../core/updater/activeTournamentDeletion.js";
import { resolveScheduleOptions } from "../../core/scheduler/scheduleOptions.js";
import { requireAdmin, requirePost } from "./auth.js";
import { readJsonPayload } from "./requestPayload.js";

export async function handleDeleteActive(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const payload = await readJsonPayload(request);
  if (!payload) return new Response("Invalid JSON payload", { status: 400 });

  try {
    const scheduleWarnings = [];
    const result = await deleteActiveRuntimeState(env, payload.slug, {
      scheduleOptions: resolveScheduleOptions(env, { applySchedules: "best-effort", scheduleWarnings })
    });
    if (scheduleWarnings.length > 0) {
      return new Response(`Deleted active runtime state with schedule warnings: ${scheduleWarnings.join(" | ")}`, { status: 207 });
    }
    return new Response(`Deleted active runtime state: ${result.deletedSlug}`, { status: 200 });
  } catch (error) {
    return new Response(`Delete Active Runtime State Error: ${error.message}`, { status: 500 });
  }
}
