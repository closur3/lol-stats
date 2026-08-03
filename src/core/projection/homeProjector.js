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
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) throw new Error("analysis must be a JSON object");
  if (!analysis.statisticsBySlug || typeof analysis.statisticsBySlug !== "object" || Array.isArray(analysis.statisticsBySlug)) {
    throw new Error("analysis.statisticsBySlug must be a JSON object");
  }
  if (!analysis.timeDistributionBySlug || typeof analysis.timeDistributionBySlug !== "object" || Array.isArray(analysis.timeDistributionBySlug)) {
    throw new Error("analysis.timeDistributionBySlug must be a JSON object");
  }
  const statistics = analysis.statisticsBySlug[slug];
  const timeDistribution = analysis.timeDistributionBySlug[slug];
  if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) throw new Error(`analysis.statisticsBySlug missing: ${slug}`);
  if (!Array.isArray(timeDistribution)) throw new Error(`analysis.timeDistributionBySlug missing: ${slug}`);
  return {
    tournamentSlug: slug,
    statistics,
    timeDistribution
  };
}

export function buildHomeSnapshots(tournaments, analysis, writeScopeSlugs) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  if (!(writeScopeSlugs instanceof Set)) throw new Error("writeScopeSlugs must be a Set");
  return Object.fromEntries(tournaments.flatMap(tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    return writeScopeSlugs.has(slug) ? [[slug, buildHomeSnapshot(tournament, analysis)]] : [];
  }));
}

export async function writeHomeSnapshots(env, snapshotsBySlug) {
  if (!snapshotsBySlug || typeof snapshotsBySlug !== "object" || Array.isArray(snapshotsBySlug)) {
    throw new Error("snapshotsBySlug must be a JSON object");
  }
  await Promise.all(Object.entries(snapshotsBySlug).map(([slug, snapshot]) => {
    if (!slug) throw new Error("ActiveHome slug missing");
    return env["lol-stats-kv"].put(kvKeys.home(slug), JSON.stringify(snapshot));
  }));
}
