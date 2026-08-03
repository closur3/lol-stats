import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';
import { createSchemaIssue, describeSchemaValue } from '../facts/schemaIssue.js';
import { readTournamentStatisticsIssue } from '../facts/tournamentStatistics.js';
import { readTimeDistributionIssue } from '../facts/timeDistribution.js';
import { getOverviewPageNames } from '../../utils/data/overviewPages.js';

export function readArchiveSnapshotIssue(snapshot, tournament, artifactKey) {
  if (snapshot == null) return createSchemaIssue({ artifactKey, path: "$", kind: "missing", expected: "stored JSON object" });
  if (typeof snapshot !== "object" || Array.isArray(snapshot)) return createSchemaIssue({ artifactKey, path: "$", kind: "invalid", expected: "JSON object", actual: describeSchemaValue(snapshot) });
  const snapshotFields = Object.keys(snapshot);
  const expectedFields = ["tournamentSlug", "statistics", "timeDistribution"];
  if (snapshotFields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(snapshot, field))) {
    return createSchemaIssue({ artifactKey, path: "$", kind: "invalid", expected: "fields tournamentSlug, statistics, timeDistribution", actual: snapshotFields.length ? snapshotFields.join(", ") : "no fields" });
  }
  if (snapshot.tournamentSlug !== tournament.slug) return createSchemaIssue({ artifactKey, path: "tournamentSlug", kind: "invalid", expected: tournament.slug, actual: describeSchemaValue(snapshot.tournamentSlug) });
  const statisticsIssue = readTournamentStatisticsIssue(snapshot.statistics, tournament, artifactKey);
  if (statisticsIssue) return statisticsIssue;
  const timeDistributionIssue = readTimeDistributionIssue(snapshot.timeDistribution, artifactKey, getOverviewPageNames(tournament.overviewPages));
  if (timeDistributionIssue) return timeDistributionIssue;
  return null;
}

async function inspectArchiveSnapshots(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const kv = env["lol-stats-kv"];
  const storedValues = await Promise.all(tournaments.map(tournament => kv.get(kvKeys.archive(tournament.slug))));
  const snapshots = [];
  const issues = [];
  storedValues.forEach((stored, index) => {
    const tournament = tournaments[index];
    let snapshot = stored;
    if (typeof stored === "string") {
      try {
        snapshot = JSON.parse(stored);
      } catch {
        issues.push(createSchemaIssue({ artifactKey: kvKeys.archive(tournament.slug), path: "$", kind: "invalid", expected: "stored JSON object", actual: "malformed JSON" }));
        return;
      }
    }
    const issue = readArchiveSnapshotIssue(snapshot, tournament, kvKeys.archive(tournament.slug));
    if (issue) issues.push(issue);
    else snapshots.push(snapshot);
  });
  return { snapshots, issues };
}

export async function readArchiveSnapshots(env, tournaments) {
  const result = await inspectArchiveSnapshots(env, tournaments);
  throwIfArtifactsUnavailable("ArchiveSnapshot", result.issues);
  return result.snapshots;
}

export async function readAvailableArchiveSnapshots(env, tournaments) {
  return inspectArchiveSnapshots(env, tournaments);
}
