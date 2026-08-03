import { readTournamentConfig } from "../../core/facts/tournamentConfigReader.js";
import { rebuildArchiveSnapshot } from "../../core/updater/archiveSnapshotRebuilder.js";
import { requireAdmin, requirePost } from "./auth.js";
import { readJsonPayload } from "./requestPayload.js";

function readSlug(payload) {
  return typeof payload?.slug === "string" ? payload.slug.trim() : "";
}

export async function handleRebuildArchive(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const rawPayload = await readJsonPayload(request);
  if (!rawPayload) return new Response("Invalid JSON payload", { status: 400 });
  const slug = readSlug(rawPayload);
  if (!slug) return new Response("Missing required field: slug", { status: 400 });

  try {
    const { archive: archiveConfig } = await readTournamentConfig(env);
    const tournament = archiveConfig.find(item => item.slug === slug);
    if (!tournament) return new Response(`TournamentConfig.archive tournament missing: ${slug}`, { status: 404 });
    await rebuildArchiveSnapshot(env, tournament);
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
