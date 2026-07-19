import { resolveScheduleOptions } from "../../core/scheduler/scheduleOptions.js";
import { assertTournamentConfigDigest } from "../../core/facts/tournamentConfigDigest.js";
import {
  reconcileTournamentRuntimeForConfig,
  TournamentConfigVersionError
} from "../../core/updater/tournamentRuntimeReconciler.js";
import { requireAdmin, requirePost } from "./auth.js";

export async function handleReconcileTournaments(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  let expectedDigest;
  try {
    expectedDigest = assertTournamentConfigDigest(
      request.headers.get("X-Tournament-Config-Digest"),
      "X-Tournament-Config-Digest"
    );
  } catch (error) {
    return new Response(error.message, { status: 400 });
  }

  try {
    const result = await reconcileTournamentRuntimeForConfig(
      env,
      Date.now(),
      resolveScheduleOptions(env),
      expectedDigest
    );
    return Response.json({ configDigest: result.config.configDigest, transition: result.transition });
  } catch (error) {
    if (error instanceof TournamentConfigVersionError) {
      return Response.json({
        error: error.message,
        expectedConfigDigest: error.expectedDigest,
        actualConfigDigest: error.actualDigest
      }, { status: 409 });
    }
    return new Response(`Tournament Reconcile Error: ${error.message}`, { status: 500 });
  }
}
