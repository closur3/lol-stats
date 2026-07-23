import { timePolicy } from "../../utils/timePolicy.js";
import { readScheduleIdentity } from "../scheduleIdentity.js";
import { parseMatchBestOf, parseMatchOutcome, parseMatchScore } from "./matchFields.js";
import { buildTeamNameResolver } from "./teamResolver.js";
import { assertTeamMap } from "../../utils/data/teamMaps.js";

function readText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareMatches(left, right) {
  return left.scheduledAt - right.scheduledAt || compareText(left.matchId, right.matchId);
}

function readTournament(tournament) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) {
    throw new Error("tournament must be a JSON object");
  }
  const slug = readText(tournament.slug, "tournament.slug");
  const teamMap = assertTeamMap(tournament.teamMap, `tournament.${slug}.teamMap`);
  return { slug, resolveTeamName: buildTeamNameResolver(teamMap) };
}

function buildMatch(rawMatch, label, sessionKey, winner, isForfeit, resolveTeamName) {
  const scheduledAt = timePolicy.deriveMatchTime(rawMatch.DateTimeUTC).timestamp;
  if (!Number.isInteger(scheduledAt) || scheduledAt < 1) {
    throw new Error(`${label}.DateTimeUTC must resolve to a positive integer timestamp`);
  }

  const team1Score = parseMatchScore(rawMatch.Team1Score, `${label}.Team1Score`);
  const team2Score = parseMatchScore(rawMatch.Team2Score, `${label}.Team2Score`);
  const bestOf = parseMatchBestOf(rawMatch.BestOf, `${label}.BestOf`);
  const team1Name = resolveTeamName(rawMatch.Team1);
  const team2Name = resolveTeamName(rawMatch.Team2);
  const isLive = winner === null && (
    team1Score > 0
    || team2Score > 0
    || (rawMatch.Team1Score !== "" && rawMatch.Team1Score != null)
  );

  return {
    sessionKey,
    match: {
      matchId: readText(rawMatch.MatchId, `${label}.MatchId`),
      scheduledAt,
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      bestOf,
      winner,
      isForfeit,
      isLive
    }
  };
}

export function buildScheduleSessions(rawMatches, tournament) {
  if (!Array.isArray(rawMatches)) throw new Error("rawMatches must be an array");
  const { slug, resolveTeamName } = readTournament(tournament);
  const matchesBySessionKey = new Map();
  const matchIds = new Set();
  const matchNumbersByTab = new Map();

  rawMatches.forEach((rawMatch, sourceIndex) => {
    if (!rawMatch || typeof rawMatch !== "object" || Array.isArray(rawMatch)) {
      throw new Error(`RawMatches[${sourceIndex}] must be a JSON object`);
    }
    const matchId = readText(rawMatch.MatchId, `RawMatches[${sourceIndex}].MatchId`);
    if (matchIds.has(matchId)) throw new Error(`RawMatches contains duplicate MatchId: ${matchId}`);
    matchIds.add(matchId);

    const label = `${slug}.${matchId}`;
    const { winner, isForfeit, isNullified } = parseMatchOutcome(rawMatch, label);
    if (isNullified) return;

    const { overviewPage, tab, matchNumber, sessionKey } = readScheduleIdentity(rawMatch, label);
    const tabKey = JSON.stringify([overviewPage, tab]);
    if (!matchNumbersByTab.has(tabKey)) matchNumbersByTab.set(tabKey, new Set());
    const usedMatchNumbers = matchNumbersByTab.get(tabKey);
    if (usedMatchNumbers.has(matchNumber)) {
      throw new Error(`${label}.NMatchInTab duplicates ${matchNumber} in ${overviewPage}/${tab}`);
    }
    usedMatchNumbers.add(matchNumber);

    const { match } = buildMatch(rawMatch, label, sessionKey, winner, isForfeit, resolveTeamName);
    if (!matchesBySessionKey.has(sessionKey)) matchesBySessionKey.set(sessionKey, []);
    matchesBySessionKey.get(sessionKey).push(match);
  });

  const sessions = Array.from(matchesBySessionKey, ([sessionKey, matches]) => ({
    sessionKey,
    matches: matches.sort(compareMatches)
  }));
  sessions.sort((left, right) => (
    left.matches[0].scheduledAt - right.matches[0].scheduledAt
    || compareText(left.sessionKey, right.sessionKey)
  ));
  return { sessions };
}
