import { loadTourConfig } from './tourConfigLoader.js';

export async function loadRuntimeConfig(env, githubClient) {
  const tournaments = await loadTourConfig(env, githubClient);
  return { TOURNAMENTS: tournaments };
}
