import { createSchemaIssue, describeSchemaValue } from "./schemaIssue.js";
import { getOverviewPageNames } from "../../utils/data/overviewPages.js";

function issue(artifactKey, path, expected, actual) {
  return createSchemaIssue({
    artifactKey,
    path,
    kind: actual == null ? "missing" : "invalid",
    expected,
    ...(actual == null ? {} : { actual: typeof actual === "string" ? actual : describeSchemaValue(actual) })
  });
}

const TeamStatsFields = [
  "bestOf3FullMatchCount", "bestOf3TotalMatchCount",
  "bestOf5FullMatchCount", "bestOf5TotalMatchCount",
  "seriesWinCount", "seriesTotalMatchCount",
  "gameWinCount", "gameTotalCount",
  "seriesTrailedCount", "comebackCount",
  "seriesLedCount", "lostLeadCount",
  "winStreakCount", "lossStreakCount",
  "last", "history"
];
const HistoryFields = [
  "dateDisplay", "fullDateDisplay", "matchId", "tabName", "scheduleSlot", "opponentName",
  "scoreDisplay", "matchResultCode", "bestOf", "isForfeit", "isFullLength", "timestamp"
];
const MatchResultCodes = new Set(["WIN", "LOSS", "DRAW", "LIVE", "NEXT"]);

function readHistoryGameResultsIssue(match, artifactKey, path, scoreMatch) {
  if (!Object.hasOwn(match, "gameResults")) return null;
  if (!Array.isArray(match.gameResults) || match.gameResults.length === 0) {
    return issue(artifactKey, `${path}.gameResults`, "non-empty W/L array", match.gameResults);
  }
  if (match.gameResults.some(result => result !== "W" && result !== "L")) {
    return issue(artifactKey, `${path}.gameResults`, "array containing only W or L", match.gameResults);
  }
  const wins = match.gameResults.filter(result => result === "W").length;
  const losses = match.gameResults.length - wins;
  if (wins !== Number(scoreMatch[1]) || losses !== Number(scoreMatch[2])) {
    return issue(artifactKey, `${path}.gameResults`, `W=${scoreMatch[1]}, L=${scoreMatch[2]} from scoreDisplay`, match.gameResults);
  }
  return null;
}

function readHistoryMatchIssue(match, artifactKey, path) {
  if (!match || typeof match !== "object" || Array.isArray(match)) return issue(artifactKey, path, "object", match);
  const turnaroundFields = ["wasBehind", "wasAhead", "turnaroundType"];
  const hasTurnaround = turnaroundFields.some(field => Object.hasOwn(match, field));
  const expectedFields = [
    ...HistoryFields,
    ...(Object.hasOwn(match, "gameResults") ? ["gameResults"] : []),
    ...(hasTurnaround ? turnaroundFields : [])
  ];
  const fields = Object.keys(match);
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(match, field))) {
    return issue(artifactKey, path, `fields ${expectedFields.join(", ")}`, fields.join(", "));
  }
  for (const field of ["dateDisplay", "fullDateDisplay", "matchId", "opponentName"]) {
    if (typeof match[field] !== "string" || !match[field]) return issue(artifactKey, `${path}.${field}`, "non-empty string", match[field]);
  }
  if (typeof match.tabName !== "string") return issue(artifactKey, `${path}.tabName`, "string", match.tabName);
  if (match.scheduleSlot !== 1 && match.scheduleSlot !== 2) return issue(artifactKey, `${path}.scheduleSlot`, "1 or 2", match.scheduleSlot);
  if (!MatchResultCodes.has(match.matchResultCode)) {
    return issue(artifactKey, `${path}.matchResultCode`, "WIN, LOSS, DRAW, LIVE, or NEXT", match.matchResultCode);
  }
  if (![1, 2, 3, 5].includes(match.bestOf)) return issue(artifactKey, `${path}.bestOf`, "1, 2, 3, or 5", match.bestOf);
  if (typeof match.isForfeit !== "boolean") return issue(artifactKey, `${path}.isForfeit`, "boolean", match.isForfeit);
  if (typeof match.isFullLength !== "boolean") return issue(artifactKey, `${path}.isFullLength`, "boolean", match.isFullLength);
  if (!Number.isFinite(match.timestamp)) return issue(artifactKey, `${path}.timestamp`, "finite number", match.timestamp);
  const scoreMatch = String(match.scoreDisplay).match(/^(\d+)-(\d+)$/);
  if (!scoreMatch) return issue(artifactKey, `${path}.scoreDisplay`, "score in X-X format", match.scoreDisplay);
  const gameResultsIssue = readHistoryGameResultsIssue(match, artifactKey, path, scoreMatch);
  if (gameResultsIssue) return gameResultsIssue;
  if (hasTurnaround && !Object.hasOwn(match, "gameResults")) {
    return issue(artifactKey, `${path}.turnaroundType`, "turnaround fields absent when gameResults is absent", match.turnaroundType);
  }
  if (hasTurnaround && (typeof match.wasBehind !== "boolean" || typeof match.wasAhead !== "boolean")) {
    return issue(artifactKey, path, "boolean wasBehind and wasAhead", `${describeSchemaValue(match.wasBehind)}, ${describeSchemaValue(match.wasAhead)}`);
  }
  if (match.turnaroundType != null && !["leadChange", "reverseSweep"].includes(match.turnaroundType)) {
    return issue(artifactKey, `${path}.turnaroundType`, "leadChange or reverseSweep", match.turnaroundType);
  }
  return null;
}

function readStatsIssue(stats, artifactKey, path) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) return issue(artifactKey, path, "object", stats);
  for (const [teamName, teamStats] of Object.entries(stats)) {
    const teamPath = `${path}.${teamName}`;
    if (!teamName) return issue(artifactKey, path, "non-empty team-name keys", teamName);
    if (!teamStats || typeof teamStats !== "object" || Array.isArray(teamStats)) return issue(artifactKey, teamPath, "object", teamStats);
    const fields = Object.keys(teamStats);
    if (fields.length !== TeamStatsFields.length || TeamStatsFields.some(field => !Object.hasOwn(teamStats, field))) {
      return issue(artifactKey, teamPath, `fields ${TeamStatsFields.join(", ")}`, fields.join(", "));
    }
    for (const field of TeamStatsFields.filter(field => field !== "history")) {
      if (!Number.isInteger(teamStats[field]) || teamStats[field] < 0) {
        return issue(artifactKey, `${teamPath}.${field}`, "non-negative integer", teamStats[field]);
      }
    }
    if (!Array.isArray(teamStats.history)) return issue(artifactKey, `${teamPath}.history`, "array", teamStats.history);
    for (const [historyIndex, match] of teamStats.history.entries()) {
      const historyIssue = readHistoryMatchIssue(match, artifactKey, `${teamPath}.history[${historyIndex}]`);
      if (historyIssue) return historyIssue;
    }
    const pairs = [
      ["bestOf3FullMatchCount", "bestOf3TotalMatchCount"],
      ["bestOf5FullMatchCount", "bestOf5TotalMatchCount"],
      ["seriesWinCount", "seriesTotalMatchCount"],
      ["gameWinCount", "gameTotalCount"],
      ["comebackCount", "seriesTrailedCount"],
      ["lostLeadCount", "seriesLedCount"]
    ];
    for (const [part, total] of pairs) {
      if (teamStats[part] > teamStats[total]) return issue(artifactKey, `${teamPath}.${part}`, `not greater than ${total}`, teamStats[part]);
    }
  }
  return null;
}

export function readTournamentStatisticsIssue(statistics, tournament, artifactKey) {
  const overviewPages = getOverviewPageNames(tournament.overviewPages);
  if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) {
    return issue(artifactKey, "statistics", "object", statistics);
  }
  const fields = Object.keys(statistics);
  const expectedFields = ["combined", "pages"];
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(statistics, field))) {
    return issue(artifactKey, "statistics", "fields combined and pages", fields.join(", "));
  }
  if (!statistics.combined || typeof statistics.combined !== "object" || Array.isArray(statistics.combined)) {
    return issue(artifactKey, "statistics.combined", "object", statistics.combined);
  }
  const combinedIssue = readStatsIssue(statistics.combined, artifactKey, "statistics.combined");
  if (combinedIssue) return combinedIssue;
  if (!Array.isArray(statistics.pages)) {
    return issue(artifactKey, "statistics.pages", "array", statistics.pages);
  }
  const expectedPageCount = overviewPages.length === 1 ? 0 : overviewPages.length;
  if (statistics.pages.length !== expectedPageCount) {
    return issue(
      artifactKey,
      "statistics.pages",
      overviewPages.length === 1 ? "empty for a single overviewPage" : "one entry per tournament overviewPage",
      `${statistics.pages.length} entries`
    );
  }

  for (const [pageIndex, page] of statistics.pages.entries()) {
    const pagePath = `statistics.pages[${pageIndex}]`;
    if (!page || typeof page !== "object" || Array.isArray(page)) {
      return issue(artifactKey, pagePath, "object", page);
    }
    const pageFields = Object.keys(page);
    const expectedPageFields = ["overviewPage", "stats"];
    if (pageFields.length !== expectedPageFields.length || expectedPageFields.some(field => !Object.hasOwn(page, field))) {
      return issue(artifactKey, pagePath, "fields overviewPage and stats", pageFields.join(", "));
    }
    if (page.overviewPage !== overviewPages[pageIndex]) {
      return issue(
        artifactKey,
        `${pagePath}.overviewPage`,
        overviewPages[pageIndex],
        page.overviewPage
      );
    }
    const statsIssue = readStatsIssue(page.stats, artifactKey, `${pagePath}.stats`);
    if (statsIssue) return statsIssue;
  }
  return null;
}
