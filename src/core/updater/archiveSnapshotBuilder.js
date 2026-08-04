import { analyzeTournaments } from "../analyzer.js";
import { readArchiveSnapshotIssue } from "./archiveSnapshotReader.js";
import { throwIfArtifactsUnavailable } from "./artifactAvailability.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

export function buildArchiveSnapshot(tournament, rawMatches) {
  if (!Array.isArray(rawMatches)) throw new Error(`Archive rawMatches invalid: ${tournament.name}`);
  const analysis = analyzeTournaments({ [tournament.name]: rawMatches }, [tournament]);
  const statistics = analysis.statisticsByName[tournament.name];
  const timeDistribution = analysis.timeDistributionByName[tournament.name];
  if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) throw new Error(`Archive statistics missing: ${tournament.name}`);
  if (!Array.isArray(timeDistribution)) throw new Error(`Archive timeDistribution missing: ${tournament.name}`);
  const snapshot = {
    tournamentName: tournament.name,
    statistics,
    timeDistribution
  };
  const schemaIssue = readArchiveSnapshotIssue(snapshot, tournament, kvKeys.archive(tournament.name));
  throwIfArtifactsUnavailable("prepared ArchiveSnapshot", schemaIssue ? [schemaIssue] : []);
  return snapshot;
}
