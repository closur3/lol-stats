import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

export function buildWriteScopeSlugs(updateItems, rebuildSlugs) {
  if (!Array.isArray(updateItems)) throw new Error("updateItems must be an array");
  if (!(rebuildSlugs instanceof Set)) throw new Error("rebuildSlugs must be a Set");
  const scope = new Set();
  for (const updateItem of updateItems) {
    if (!updateItem || typeof updateItem !== "object" || !updateItem.slug) throw new Error("write scope item slug missing");
    scope.add(updateItem.slug);
  }

  for (const slug of rebuildSlugs) scope.add(slug);
  return scope;
}

function buildHomeSnapshot(tournament, analysis) {
  const slug = tournament.slug;
  const tournamentStored = { ...tournament };
  delete tournamentStored.teamMap;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) throw new Error("analysis must be a JSON object");
  if (!analysis.globalStats || typeof analysis.globalStats !== "object" || Array.isArray(analysis.globalStats)) {
    throw new Error("analysis.globalStats must be a JSON object");
  }
  if (!analysis.timeGrid || typeof analysis.timeGrid !== "object" || Array.isArray(analysis.timeGrid)) {
    throw new Error("analysis.timeGrid must be a JSON object");
  }
  const stats = analysis.globalStats[slug];
  const timeGrid = analysis.timeGrid[slug];
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) throw new Error(`analysis.globalStats missing: ${slug}`);
  if (!timeGrid || typeof timeGrid !== "object" || Array.isArray(timeGrid)) throw new Error(`analysis.timeGrid missing: ${slug}`);
  return {
    tournament: tournamentStored,
    stats,
    timeGrid
  };
}

export async function writeHomeProjections(env, tournaments, analysis, writeScopeSlugs) {
  await Promise.all(tournaments.map(async (tournament) => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    if (!writeScopeSlugs.has(slug)) return;
    const homeSnapshot = buildHomeSnapshot(tournament, analysis);
    await env["lol-stats-kv"].put(kvKeys.home(slug), JSON.stringify(homeSnapshot));
  }));
}
