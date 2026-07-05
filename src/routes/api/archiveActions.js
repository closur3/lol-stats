import { deleteArchiveSnapshot } from "../../core/updater/archiveSnapshotDeletion.js";
import { readArchiveConfig } from "../../core/updater/archiveConfigReader.js";
import { rebuildArchiveSnapshot } from "../../core/updater/archiveSnapshotRebuilder.js";
import { requireAdmin, requirePost } from "./auth.js";

function readSlug(payload) {
  return typeof payload?.slug === "string" ? payload.slug.trim() : "";
}

async function readJsonPayload(request) {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
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
    const archiveConfig = await readArchiveConfig(env);
    const tournament = archiveConfig.find(item => item.slug === slug);
    if (!tournament) return new Response(`CONFIG_ARCHIVE tournament missing: ${slug}`, { status: 404 });
    await rebuildArchiveSnapshot(env, tournament);
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

export async function handleDeleteArchive(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const payload = await readJsonPayload(request);
  if (!payload) return new Response("Invalid JSON payload", { status: 400 });
  const slug = readSlug(payload);
  if (!slug) return new Response("Missing required field: slug", { status: 400 });

  try {
    await deleteArchiveSnapshot(env, slug);
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response(`Delete Error: ${error.message}`, { status: 500 });
  }
}
