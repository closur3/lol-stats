import { GitHubClient } from "../../api/githubClient.js";
import { importArchiveIndexFromGitHubBackup, rebuildArchiveIndexFromSnapshots } from "../../core/updater/archiveIndex.js";
import { requireAdmin, requirePost } from "./auth.js";

export async function handleRebuildArchiveIndex(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const archivedTournaments = await rebuildArchiveIndexFromSnapshots(env);
    return new Response(`Rebuilt CONFIG_ARCHIVE from ARCHIVE_*: ${archivedTournaments.length}`, { status: 200 });
  } catch (error) {
    return new Response(`Rebuild Index Error: ${error.message}`, { status: 500 });
  }
}

export async function handleImportArchiveIndex(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const githubClient = new GitHubClient(env);
    const archivedTournaments = await importArchiveIndexFromGitHubBackup(env, githubClient);
    return new Response(`Imported CONFIG_ARCHIVE from GitHub backup: ${archivedTournaments.length}`, { status: 200 });
  } catch (error) {
    return new Response(`Import Index Error: ${error.message}`, { status: 500 });
  }
}
