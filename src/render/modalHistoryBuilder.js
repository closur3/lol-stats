import { describeSchemaValue, readSchemaIssue, throwSchemaIssue } from "../core/facts/schemaIssue.js";
import { parseScheduleSessionKey } from "../core/scheduleIdentity.js";
import { timePolicy } from "../utils/timePolicy.js";

const FinishedResultCodes = new Set(["WIN", "LOSS", "DRAW"]);
const MatchResultCodes = new Set([...FinishedResultCodes, "LIVE", "NEXT"]);

function requireObject(value, artifactKey, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throwSchemaIssue({ artifactKey, path, kind: value == null ? "missing" : "invalid", expected: "object", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
  }
}

function requireText(value, artifactKey, path, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    throwSchemaIssue({ artifactKey, path, kind: value == null || value === "" ? "missing" : "invalid", expected: allowEmpty ? "string" : "non-empty string", ...(value == null || value === "" ? {} : { actual: describeSchemaValue(value) }) });
  }
  return value;
}

function projectArtifactHistory(artifact, artifactType) {
  const initialSlug = artifact?.tournament?.slug || "unknown";
  const initialArtifactKey = `${artifactType}_${initialSlug}`;
  requireObject(artifact, initialArtifactKey, "$");
  requireObject(artifact.tournament, initialArtifactKey, "tournament");

  const slug = requireText(artifact.tournament.slug, initialArtifactKey, "tournament.slug");
  const artifactKey = `${artifactType}_${slug}`;
  const tournamentName = requireText(artifact.tournament.name, artifactKey, "tournament.name");
  requireObject(artifact.stats, artifactKey, "stats");

  const historyEntries = [];
  for (const [teamName, teamStats] of Object.entries(artifact.stats)) {
    const teamPath = `stats.${teamName}`;
    const historyPath = `${teamPath}.history`;
    requireText(teamName, artifactKey, teamPath);
    requireObject(teamStats, artifactKey, teamPath);
    if (!Array.isArray(teamStats.history)) {
      throwSchemaIssue({ artifactKey, path: historyPath, kind: teamStats.history == null ? "missing" : "invalid", expected: "array", ...(teamStats.history == null ? {} : { actual: describeSchemaValue(teamStats.history) }) });
    }

    for (const [historyIndex, match] of teamStats.history.entries()) {
      const matchPath = `${historyPath}[${historyIndex}]`;
      requireObject(match, artifactKey, matchPath);
      const matchId = requireText(match.matchId, artifactKey, `${matchPath}.matchId`);
      const tabName = requireText(match.tabName, artifactKey, `${matchPath}.tabName`, true);
      const opponentName = requireText(match.opponentName, artifactKey, `${matchPath}.opponentName`);
      if (match.scheduleSlot !== 1 && match.scheduleSlot !== 2) {
        const value = match.scheduleSlot;
        throwSchemaIssue({ artifactKey, path: `${matchPath}.scheduleSlot`, kind: value == null ? "missing" : "invalid", expected: "1 or 2", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
      }
      if (!MatchResultCodes.has(match.matchResultCode)) {
        const value = match.matchResultCode;
        throwSchemaIssue({ artifactKey, path: `${matchPath}.matchResultCode`, kind: value == null ? "missing" : "invalid", expected: "WIN, LOSS, DRAW, LIVE, or NEXT", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
      }
      if (!FinishedResultCodes.has(match.matchResultCode)) continue;

      historyEntries.push({
        tournamentSlug: slug,
        tournamentName,
        tabName,
        matchId,
        scheduleSlot: match.scheduleSlot,
        teamName,
        opponentName,
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
  return historyEntries;
}

function projectUpcomingHistory(activeTournaments, scheduleSessionsMap) {
  if (!Array.isArray(activeTournaments)) throw new Error("activeTournaments must be an array");
  if (!(scheduleSessionsMap instanceof Map)) throw new Error("scheduleSessionsMap must be a Map");
  const expectedSlugs = new Set(activeTournaments.map(tournament => tournament.slug));
  for (const slug of scheduleSessionsMap.keys()) {
    if (!expectedSlugs.has(slug)) throw new Error(`scheduleSessionsMap contains unexpected slug: ${String(slug)}`);
  }

  const historyEntries = [];
  for (const tournament of activeTournaments) {
    if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) throw new Error("Active tournament must be an object");
    const { slug, name: tournamentName } = tournament;
    if (typeof slug !== "string" || slug === "") throw new Error("Active tournament slug missing");
    if (typeof tournamentName !== "string" || tournamentName === "") throw new Error(`Active tournament name missing: ${slug}`);
    if (!scheduleSessionsMap.has(slug)) throw new Error(`scheduleSessionsMap missing: ${slug}`);
    const scheduleSessions = scheduleSessionsMap.get(slug);
    if (!scheduleSessions || !Array.isArray(scheduleSessions.sessions)) throw new Error(`ScheduleSessions invalid: ${slug}`);

    for (const session of scheduleSessions.sessions) {
      const { tab: tabName } = parseScheduleSessionKey(session.sessionKey, `ScheduleSessions.${slug}.${session.sessionKey}`);
      for (const match of session.matches) {
        if (match.winner !== null) continue;
        const matchResultCode = match.isLive ? "LIVE" : "NEXT";
        const dateDisplay = timePolicy.formatMonthDayTime(match.scheduledAt);
        const fullDateDisplay = timePolicy.getCurrentAppDateTime(match.scheduledAt).dateString;
        const common = {
          tournamentSlug: slug,
          tournamentName,
          tabName,
          matchId: match.matchId,
          dateDisplay,
          fullDateDisplay,
          matchResultCode,
          bestOf: match.bestOf,
          isForfeit: match.isForfeit,
          isFullLength: false,
          timestamp: match.scheduledAt
        };
        historyEntries.push({
          ...common,
          scheduleSlot: 1,
          teamName: match.team1Name,
          opponentName: match.team2Name,
          scoreDisplay: `${match.team1Score}-${match.team2Score}`
        });
        historyEntries.push({
          ...common,
          scheduleSlot: 2,
          teamName: match.team2Name,
          opponentName: match.team1Name,
          scoreDisplay: `${match.team2Score}-${match.team1Score}`
        });
      }
    }
  }
  return historyEntries;
}

export function inspectModalHistory(activeHomes, archiveSnapshots, activeTournaments, scheduleSessionsMap) {
  if (!Array.isArray(activeHomes)) throw new Error("activeHomes must be an array");
  if (!Array.isArray(archiveSnapshots)) throw new Error("archiveSnapshots must be an array");

  const history = [];
  const issues = [];
  const inspectArtifact = (artifact, artifactType) => {
    const slug = artifact?.tournament?.slug || "unknown";
    const artifactKey = `${artifactType}_${slug}`;
    try {
      history.push(...projectArtifactHistory(artifact, artifactType));
    } catch (error) {
      const issue = readSchemaIssue(error);
      if (issue.artifactKey !== artifactKey) {
        throw new Error(`Modal history artifact identity mismatch: ${artifactKey}`, { cause: error });
      }
      issues.push(issue);
    }
  };

  activeHomes.forEach(artifact => inspectArtifact(artifact, "ActiveHome"));
  archiveSnapshots.forEach(artifact => inspectArtifact(artifact, "ArchiveSnapshot"));
  history.push(...projectUpcomingHistory(activeTournaments, scheduleSessionsMap));
  history.sort((leftMatch, rightMatch) => (
    rightMatch.timestamp - leftMatch.timestamp
    || leftMatch.matchId.localeCompare(rightMatch.matchId)
    || leftMatch.scheduleSlot - rightMatch.scheduleSlot
  ));
  return { history, issues };
}
