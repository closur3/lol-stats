import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';
import { createSchemaIssue, describeSchemaValue } from '../facts/schemaIssue.js';
import { readTournamentStatisticsIssue } from '../facts/tournamentStatistics.js';
import { readTimeDistributionIssue } from '../facts/timeDistribution.js';
import { getOverviewPageNames } from '../../utils/data/overviewPages.js';

export function readActiveSnapshotIssue(snapshot, tournament, artifactKey) {
  if (snapshot == null) return createSchemaIssue({ artifactKey, path: "$", kind: "missing", expected: "stored JSON object" });
  if (typeof snapshot !== "object" || Array.isArray(snapshot)) return createSchemaIssue({ artifactKey, path: "$", kind: "invalid", expected: "JSON object", actual: describeSchemaValue(snapshot) });
  const snapshotFields = Object.keys(snapshot);
  const expectedFields = ["tournamentName", "statistics", "timeDistribution"];
  if (snapshotFields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(snapshot, field))) {
    return createSchemaIssue({ artifactKey, path: "$", kind: "invalid", expected: "fields tournamentName, statistics, timeDistribution", actual: snapshotFields.length ? snapshotFields.join(", ") : "no fields" });
  }
  if (snapshot.tournamentName !== tournament.name) return createSchemaIssue({ artifactKey, path: "tournamentName", kind: "invalid", expected: tournament.name, actual: describeSchemaValue(snapshot.tournamentName) });
  const statisticsIssue = readTournamentStatisticsIssue(snapshot.statistics, tournament, artifactKey);
  if (statisticsIssue) return statisticsIssue;
  const timeDistributionIssue = readTimeDistributionIssue(snapshot.timeDistribution, artifactKey, getOverviewPageNames(tournament.overviewPages));
  if (timeDistributionIssue) return timeDistributionIssue;
  return null;
}

export async function inspectActiveSnapshots(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const kv = env["lol-stats-kv"];
  const storedValues = await Promise.all(tournaments.map(tournament => kv.get(kvKeys.active(tournament.name))));
  return storedValues.map((stored, index) => {
    const tournament = tournaments[index];
    const tournamentName = tournament.name;
    let activeSnapshot = stored;
    if (typeof stored === "string") {
      try {
        activeSnapshot = JSON.parse(stored);
      } catch {
        return {
          tournamentName,
          activeSnapshot: null,
          issue: createSchemaIssue({ artifactKey: kvKeys.active(tournamentName), path: "$", kind: "invalid", expected: "stored JSON object", actual: "malformed JSON" })
        };
      }
    }
    return { tournamentName, activeSnapshot, issue: readActiveSnapshotIssue(activeSnapshot, tournament, kvKeys.active(tournamentName)) };
  });
}

export async function readActiveSnapshots(env, tournaments) {
  const entries = await inspectActiveSnapshots(env, tournaments);
  throwIfArtifactsUnavailable("ActiveSnapshot", entries.flatMap(entry => entry.issue ? [entry.issue] : []));
  return entries.map(entry => entry.activeSnapshot);
}

export async function readAvailableActiveSnapshots(env, tournaments) {
  const entries = await inspectActiveSnapshots(env, tournaments);
  return {
    activeSnapshots: entries.filter(entry => !entry.issue).map(entry => entry.activeSnapshot),
    issues: entries.flatMap(entry => entry.issue ? [entry.issue] : [])
  };
}
