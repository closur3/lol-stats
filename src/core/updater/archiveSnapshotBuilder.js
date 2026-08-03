import { analyzeTournaments } from "../analyzer.js";
import { readArchiveSnapshotIssue } from "./archiveSnapshotReader.js";
import { throwIfArtifactsUnavailable } from "./artifactAvailability.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

export function buildArchiveSnapshot(tournament, rawMatches) {
  if (!Array.isArray(rawMatches)) throw new Error(`Archive rawMatches invalid: ${tournament.slug}`);
  const analysis = analyzeTournaments({ [tournament.slug]: rawMatches }, [tournament]);
  const statistics = analysis.statisticsBySlug[tournament.slug];
  const timeDistribution = analysis.timeDistributionBySlug[tournament.slug];
  if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) throw new Error(`Archive statistics missing: ${tournament.slug}`);
  if (!Array.isArray(timeDistribution)) throw new Error(`Archive timeDistribution missing: ${tournament.slug}`);
  const snapshot = {
    tournamentSlug: tournament.slug,
    statistics,
    timeDistribution
  };
  const schemaIssue = readArchiveSnapshotIssue(snapshot, tournament, kvKeys.archive(tournament.slug));
  throwIfArtifactsUnavailable("prepared ArchiveSnapshot", schemaIssue ? [schemaIssue] : []);
  return snapshot;
}
