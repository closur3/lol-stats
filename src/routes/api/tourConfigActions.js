import { GitHubClient } from "../../api/githubClient.js";
import { importTourConfigFromGitHub } from "../../core/updater/tourConfigLoader.js";
import { requireAdmin, requirePost } from "./auth.js";

export async function handleImportTourConfig(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const githubClient = new GitHubClient(env);
    const tournaments = await importTourConfigFromGitHub(env, githubClient);
    return new Response(`Imported CONFIG_TOUR from GitHub: ${tournaments.length}`, { status: 200 });
  } catch (error) {
    return new Response(`Import CONFIG_TOUR Error: ${error.message}`, { status: 500 });
  }
}
