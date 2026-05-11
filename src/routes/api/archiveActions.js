import { deleteArchiveSnapshot, rebuildArchiveFromPayload, writeManualArchive } from "../../core/updater/archiveWriter.js";
import { dataUtils } from "../../utils/dataUtils.js";
import { requireAdmin, requirePost } from "./auth.js";

function normalizeArchivePayload(payload, parser) {
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const league = typeof payload.league === "string" ? payload.league.trim() : "";
  const startDate = typeof payload.start_date === "string" ? payload.start_date.trim() : "";
  const endDate = typeof payload.end_date === "string" ? payload.end_date.trim() : "";
  const overviewPages = parser(payload.overview_page);
  return { slug, name, league, startDate, endDate, overviewPages };
}

function assertArchivePayload(payload) {
  if (!payload.slug || !payload.name || !payload.league || !payload.startDate || !payload.endDate || payload.overviewPages.length === 0) {
    return new Response("Missing required fields. Please provide slug, name, overview_page, league, start_date, and end_date.", { status: 400 });
  }
  return null;
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
  const payload = normalizeArchivePayload(rawPayload, dataUtils.normalizeOverviewPages);
  const payloadError = assertArchivePayload(payload);
  if (payloadError) return payloadError;

  try {
    await rebuildArchiveFromPayload(env, payload);
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
  if (!payload.slug || !payload.name) return new Response("Missing required fields: slug, name", { status: 400 });

  try {
    await deleteArchiveSnapshot(env, payload.slug);
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response(`Delete Error: ${error.message}`, { status: 500 });
  }
}

export async function handleManualArchive(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const rawPayload = await readJsonPayload(request);
  if (!rawPayload) return new Response("Invalid JSON payload", { status: 400 });
  const payload = normalizeArchivePayload(rawPayload, dataUtils.parseOverviewPages);
  const payloadError = assertArchivePayload(payload);
  if (payloadError) return payloadError;

  try {
    await writeManualArchive(env, payload);
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response(`Save Error: ${error.message}`, { status: 500 });
  }
}
