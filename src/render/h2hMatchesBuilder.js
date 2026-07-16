import { describeSchemaValue, readSchemaIssue, throwSchemaIssue } from "../core/facts/schemaIssue.js";

const FinishedResultCodes = new Set(["WIN", "LOSS", "DRAW"]);
const MatchResultCodes = new Set([...FinishedResultCodes, "LIVE", "NEXT"]);

function requireObject(value, artifactKey, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throwSchemaIssue({ artifactKey, path, kind: value == null ? "missing" : "invalid", expected: "object", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
  }
}

function projectArtifactMatches(artifact, artifactType) {
  const initialSlug = artifact?.tournament?.slug || "unknown";
  const initialArtifactKey = `${artifactType}_${initialSlug}`;
  requireObject(artifact, initialArtifactKey, "$");
  requireObject(artifact.tournament, initialArtifactKey, "tournament");

  const { slug, leagueShort } = artifact.tournament;
  if (typeof slug !== "string" || !slug) {
    throwSchemaIssue({ artifactKey: initialArtifactKey, path: "tournament.slug", kind: slug == null || slug === "" ? "missing" : "invalid", expected: "non-empty string", ...(slug == null || slug === "" ? {} : { actual: describeSchemaValue(slug) }) });
  }
  const artifactKey = `${artifactType}_${slug}`;
  requireObject(artifact.stats, artifactKey, "stats");
  if (typeof leagueShort !== "string" || !leagueShort) {
    throwSchemaIssue({ artifactKey, path: "tournament.leagueShort", kind: leagueShort == null || leagueShort === "" ? "missing" : "invalid", expected: "non-empty string", ...(leagueShort == null || leagueShort === "" ? {} : { actual: describeSchemaValue(leagueShort) }) });
  }

  const matches = [];
  for (const [teamName, teamStats] of Object.entries(artifact.stats)) {
    const teamPath = `stats.${teamName}`;
    const historyPath = `${teamPath}.history`;
    requireObject(teamStats, artifactKey, teamPath);
    if (!Array.isArray(teamStats.history)) {
      throwSchemaIssue({ artifactKey, path: historyPath, kind: teamStats.history == null ? "missing" : "invalid", expected: "array", ...(teamStats.history == null ? {} : { actual: describeSchemaValue(teamStats.history) }) });
    }

    for (const [historyIndex, match] of teamStats.history.entries()) {
      const matchPath = `${historyPath}[${historyIndex}]`;
      requireObject(match, artifactKey, matchPath);
      if (match.scheduleSlot !== 1 && match.scheduleSlot !== 2) {
        const value = match.scheduleSlot;
        throwSchemaIssue({ artifactKey, path: `${matchPath}.scheduleSlot`, kind: value == null ? "missing" : "invalid", expected: "1 or 2", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
      }
      if (!MatchResultCodes.has(match.matchResultCode)) {
        const value = match.matchResultCode;
        throwSchemaIssue({ artifactKey, path: `${matchPath}.matchResultCode`, kind: value == null ? "missing" : "invalid", expected: "WIN, LOSS, DRAW, LIVE, or NEXT", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
      }
      if (match.scheduleSlot === 2 || !FinishedResultCodes.has(match.matchResultCode)) continue;
      if (typeof match.opponentName !== "string" || !match.opponentName) {
        const value = match.opponentName;
        throwSchemaIssue({ artifactKey, path: `${matchPath}.opponentName`, kind: value == null || value === "" ? "missing" : "invalid", expected: "non-empty string", ...(value == null || value === "" ? {} : { actual: describeSchemaValue(value) }) });
      }

      matches.push({
        tournamentSlug: slug,
        leagueShort,
        leftTeamName: teamName,
        rightTeamName: match.opponentName,
        dateDisplay: match.dateDisplay,
        fullDateDisplay: match.fullDateDisplay,
        scoreDisplay: match.scoreDisplay,
        matchResultCode: match.matchResultCode,
        bestOf: match.bestOf,
        isForfeit: match.isForfeit,
        isFullLength: match.isFullLength,
        timestamp: match.timestamp,
        ...(Array.isArray(match.gameResults) ? { gameResults: match.gameResults } : {}),
        ...(match.turnaroundType == null ? {} : { turnaroundType: match.turnaroundType })
      });
    }
  }
  return matches;
}

export function inspectH2HArtifacts(activeHomes, archiveSnapshots) {
  if (!Array.isArray(activeHomes)) throw new Error("activeHomes must be an array");
  if (!Array.isArray(archiveSnapshots)) throw new Error("archiveSnapshots must be an array");

  const matches = [];
  const issues = [];
  const inspectArtifact = (artifact, artifactType) => {
    const slug = artifact?.tournament?.slug || "unknown";
    const artifactKey = `${artifactType}_${slug}`;
    try {
      matches.push(...projectArtifactMatches(artifact, artifactType));
    } catch (error) {
      const issue = readSchemaIssue(error);
      if (issue.artifactKey !== artifactKey) {
        throw new Error(`H2H artifact identity mismatch: ${artifactKey}`, { cause: error });
      }
      issues.push(issue);
    }
  };

  activeHomes.forEach(artifact => inspectArtifact(artifact, "ActiveHome"));
  archiveSnapshots.forEach(artifact => inspectArtifact(artifact, "ArchiveSnapshot"));
  matches.sort((leftMatch, rightMatch) => rightMatch.timestamp - leftMatch.timestamp);
  return { matches, issues };
}
