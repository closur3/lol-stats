import { resolveScheduleOptions } from "../../core/scheduler/scheduleOptions.js";
import { readTournamentConfig } from "../../core/facts/tournamentConfigReader.js";
import { forceActiveTournaments } from "../../core/updater/activeForceRunner.js";
import { requireAdmin } from "./auth.js";

function parseForceNames(body) {
  if (!body || !Array.isArray(body.names)) return null;
  const cleanNames = body.names
    .filter(tournamentName => typeof tournamentName === "string")
    .map(tournamentName => tournamentName.trim())
    .filter(Boolean);
  return cleanNames.length > 0 ? new Set(cleanNames) : null;
}

export async function handleForceUpdate(request, env) {
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    let forceNames = null;
    try {
      forceNames = parseForceNames(await request.json());
      if (!forceNames) return new Response("Missing required field: names[]", { status: 400 });
    } catch (_error) {
      return new Response("Invalid JSON payload", { status: 400 });
    }

    let tournaments;
    try {
      ({ active: tournaments } = await readTournamentConfig(env));
    } catch (error) {
      return new Response(`Config load failed: ${error.message}`, { status: 500 });
    }
    if (!Array.isArray(tournaments)) return new Response("Invalid tournaments config", { status: 500 });

    const forcedTournaments = tournaments.filter(tournament => forceNames.has(tournament.name));
    if (forcedTournaments.length !== forceNames.size) return new Response("Unknown tournamentName in names[]", { status: 400 });

    const scheduleWarnings = [];
    const scheduleOptions = resolveScheduleOptions(env, { applySchedules: "best-effort", scheduleWarnings });
    await forceActiveTournaments(env, tournaments, forceNames, Date.now(), scheduleOptions);
    if (scheduleWarnings.length > 0) {
      return new Response(`PARTIAL scheduleWarnings=${scheduleWarnings.join(" | ")}`, { status: 207 });
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response(`Worker Error: ${error.message}`, { status: 500 });
  }
}
