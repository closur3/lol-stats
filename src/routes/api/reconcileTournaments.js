import { resolveScheduleOptions } from "../../core/scheduler/scheduleOptions.js";
import { reconcileTournamentRuntime } from "../../core/updater/tournamentRuntimeReconciler.js";
import { requireAdmin, requirePost } from "./auth.js";

export async function handleReconcileTournaments(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    const result = await reconcileTournamentRuntime(env, Date.now(), resolveScheduleOptions(env));
    return Response.json(result.transition);
  } catch (error) {
    return new Response(`Tournament Reconcile Error: ${error.message}`, { status: 500 });
  }
}
