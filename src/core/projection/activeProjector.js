import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

export function buildWriteScopeNames(updateItems, rebuildNames) {
  if (!Array.isArray(updateItems)) throw new Error("updateItems must be an array");
  if (!(rebuildNames instanceof Set)) throw new Error("rebuildNames must be a Set");
  const scope = new Set();
  for (const updateItem of updateItems) {
    if (!updateItem || typeof updateItem !== "object" || !updateItem.tournamentName) throw new Error("write scope item tournamentName missing");
    scope.add(updateItem.tournamentName);
  }

  for (const tournamentName of rebuildNames) scope.add(tournamentName);
  return scope;
}

function buildActiveSnapshot(tournament, analysis) {
  const tournamentName = tournament.name;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) throw new Error("analysis must be a JSON object");
  if (!analysis.statisticsByName || typeof analysis.statisticsByName !== "object" || Array.isArray(analysis.statisticsByName)) {
    throw new Error("analysis.statisticsByName must be a JSON object");
  }
  if (!analysis.timeDistributionByName || typeof analysis.timeDistributionByName !== "object" || Array.isArray(analysis.timeDistributionByName)) {
    throw new Error("analysis.timeDistributionByName must be a JSON object");
  }
  const statistics = analysis.statisticsByName[tournamentName];
  const timeDistribution = analysis.timeDistributionByName[tournamentName];
  if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) throw new Error(`analysis.statisticsByName missing: ${tournamentName}`);
  if (!Array.isArray(timeDistribution)) throw new Error(`analysis.timeDistributionByName missing: ${tournamentName}`);
  return {
    tournamentName: tournamentName,
    statistics,
    timeDistribution
  };
}

export function buildActiveSnapshots(tournaments, analysis, writeScopeNames) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  if (!(writeScopeNames instanceof Set)) throw new Error("writeScopeNames must be a Set");
  return Object.fromEntries(tournaments.flatMap(tournament => {
    const tournamentName = tournament?.name;
    if (!tournamentName) throw new Error("Tournament tournamentName missing");
    return writeScopeNames.has(tournamentName) ? [[tournamentName, buildActiveSnapshot(tournament, analysis)]] : [];
  }));
}

export async function writeActiveSnapshots(env, snapshotsByName) {
  if (!snapshotsByName || typeof snapshotsByName !== "object" || Array.isArray(snapshotsByName)) {
    throw new Error("snapshotsByName must be a JSON object");
  }
  await Promise.all(Object.entries(snapshotsByName).map(([tournamentName, snapshot]) => {
    if (!tournamentName) throw new Error("ActiveSnapshot tournamentName missing");
    return env["lol-stats-kv"].put(kvKeys.active(tournamentName), JSON.stringify(snapshot));
  }));
}
