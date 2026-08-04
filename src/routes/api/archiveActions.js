import { readTournamentConfig } from "../../core/facts/tournamentConfigReader.js";
import { rebuildArchiveSnapshot } from "../../core/updater/archiveSnapshotRebuilder.js";
import { requireAdmin, requirePost } from "./auth.js";
import { readJsonPayload } from "./requestPayload.js";

function readName(payload) {
  return typeof payload?.name === "string" ? payload.name.trim() : "";
}

export async function handleRebuildArchive(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const rawPayload = await readJsonPayload(request);
  if (!rawPayload) return new Response("Invalid JSON payload", { status: 400 });
  const tournamentName = readName(rawPayload);
  if (!tournamentName) return new Response("Missing required field: name", { status: 400 });

  try {
    const { archive: archiveConfig } = await readTournamentConfig(env);
    const tournament = archiveConfig.find(item => item.name === tournamentName);
    if (!tournament) return new Response(`TournamentConfig.archive tournament missing: ${tournamentName}`, { status: 404 });
    await rebuildArchiveSnapshot(env, tournament);
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
