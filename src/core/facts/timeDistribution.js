import { createSchemaIssue, describeSchemaValue } from "./schemaIssue.js";

const MatchFields = [
  "timeSlot", "weekdayIndex", "overviewPage", "tabName", "dateDisplay", "fullDateDisplay", "timestamp",
  "team1Name", "team2Name", "scoreDisplay", "winner", "isForfeit", "isFullLength", "bestOf"
];

function issue(artifactKey, path, expected, actual) {
  return createSchemaIssue({
    artifactKey,
    path,
    kind: actual == null ? "missing" : "invalid",
    expected,
    ...(actual == null ? {} : { actual: describeSchemaValue(actual) })
  });
}

function readGameResultsIssue(match, artifactKey, path, scoreMatch) {
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

function readMatchIssue(match, artifactKey, index, allowedOverviewPages) {
  const path = `timeDistribution[${index}]`;
  if (!match || typeof match !== "object" || Array.isArray(match)) return issue(artifactKey, path, "object", match);
  const expectedFields = [
    ...MatchFields,
    ...(Object.hasOwn(match, "gameResults") ? ["gameResults"] : []),
    ...(Object.hasOwn(match, "turnaroundType") ? ["turnaroundType"] : [])
  ];
  const fields = Object.keys(match);
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(match, field))) {
    return issue(artifactKey, path, `fields ${expectedFields.join(", ")}`, fields.join(", "));
  }
  if (typeof match.timeSlot !== "string" || !/^\d{1,2}$/.test(match.timeSlot) || Number(match.timeSlot) > 23) {
    return issue(artifactKey, `${path}.timeSlot`, "hour string from 0 to 23", match.timeSlot);
  }
  if (!Number.isInteger(match.weekdayIndex) || match.weekdayIndex < 0 || match.weekdayIndex > 6) {
    return issue(artifactKey, `${path}.weekdayIndex`, "integer from 0 to 6", match.weekdayIndex);
  }
  for (const field of ["overviewPage", "dateDisplay", "fullDateDisplay", "team1Name", "team2Name"]) {
    if (typeof match[field] !== "string" || !match[field]) return issue(artifactKey, `${path}.${field}`, "non-empty string", match[field]);
  }
  if (typeof match.tabName !== "string") return issue(artifactKey, `${path}.tabName`, "string", match.tabName);
  if (allowedOverviewPages && !allowedOverviewPages.has(match.overviewPage)) {
    return issue(artifactKey, `${path}.overviewPage`, "overviewPage from TournamentConfig", match.overviewPage);
  }
  if (!Number.isFinite(match.timestamp)) return issue(artifactKey, `${path}.timestamp`, "finite number", match.timestamp);
  if (![0, 1, 2].includes(match.winner)) return issue(artifactKey, `${path}.winner`, "0, 1, or 2", match.winner);
  if (typeof match.isForfeit !== "boolean") return issue(artifactKey, `${path}.isForfeit`, "boolean", match.isForfeit);
  if (typeof match.isFullLength !== "boolean") return issue(artifactKey, `${path}.isFullLength`, "boolean", match.isFullLength);
  if (match.bestOf !== 3 && match.bestOf !== 5) return issue(artifactKey, `${path}.bestOf`, "3 or 5", match.bestOf);
  const scoreMatch = String(match.scoreDisplay).match(/^(\d+)-(\d+)$/);
  if (!scoreMatch) return issue(artifactKey, `${path}.scoreDisplay`, "score in X-X format", match.scoreDisplay);
  const gameResultsIssue = readGameResultsIssue(match, artifactKey, path, scoreMatch);
  if (gameResultsIssue) return gameResultsIssue;
  if (Object.hasOwn(match, "turnaroundType") && !Object.hasOwn(match, "gameResults")) {
    return issue(artifactKey, `${path}.turnaroundType`, "absent when gameResults is absent", match.turnaroundType);
  }
  if (match.turnaroundType != null && !["leadChange", "reverseSweep"].includes(match.turnaroundType)) {
    return issue(artifactKey, `${path}.turnaroundType`, "leadChange or reverseSweep", match.turnaroundType);
  }
  return null;
}

export function readTimeDistributionIssue(distribution, artifactKey, overviewPages = null) {
  if (!Array.isArray(distribution)) return issue(artifactKey, "timeDistribution", "array", distribution);
  const allowedOverviewPages = overviewPages === null ? null : new Set(overviewPages);
  for (const [index, match] of distribution.entries()) {
    const matchIssue = readMatchIssue(match, artifactKey, index, allowedOverviewPages);
    if (matchIssue) return matchIssue;
  }
  return null;
}
