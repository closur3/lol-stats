import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

const MatchFields = [
  "Team1", "Team2", "Winner", "Team1Score", "Team2Score", "FF", "IsNullified",
  "DateTimeUTC", "OverviewPage", "BestOf", "Tab", "MatchDay", "NMatchInTab", "MatchId", "games"
];
const GameFields = ["gameId", "number", "blue", "red", "winner", "isRemake"];

function assertExactFields(value, expectedFields, label) {
  const fields = Object.keys(value);
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(value, field))) {
    throw new Error(`${label} fields must match the schema`);
  }
}

export function assertRawMatches(tournamentName, rawMatches) {
  if (!Array.isArray(rawMatches)) {
    throw new Error(`RawMatches must be an array: ${tournamentName}`);
  }
  if (rawMatches.length === 0) throw new Error(`RawMatches must not be empty: ${tournamentName}`);
  rawMatches.forEach((match, matchIndex) => {
    const matchLabel = `RawMatches_${tournamentName}[${matchIndex}]`;
    if (!match || typeof match !== "object" || Array.isArray(match)) throw new Error(`${matchLabel} must be an object`);
    assertExactFields(match, MatchFields, matchLabel);
    if (!Array.isArray(match.games)) throw new Error(`${matchLabel}.games must be an array`);
    match.games.forEach((game, gameIndex) => {
      const gameLabel = `${matchLabel}.games[${gameIndex}]`;
      if (!game || typeof game !== "object" || Array.isArray(game)) throw new Error(`${gameLabel} must be an object`);
      assertExactFields(game, GameFields, gameLabel);
    });
  });
}

export async function readRawMatches(env, tournamentName) {
  if (!tournamentName) throw new Error("rawMatches tournamentName missing");
  const rawMatches = await env["lol-stats-kv"].get(kvKeys.rawMatches(tournamentName), { type: "json" });
  if (rawMatches == null) throw new Error(`RawMatches missing: ${tournamentName}`);
  assertRawMatches(tournamentName, rawMatches);
  return rawMatches;
}

export async function writeRawMatches(env, tournamentName, rawMatches) {
  if (!tournamentName) throw new Error("rawMatches tournamentName missing");
  assertRawMatches(tournamentName, rawMatches);
  await env["lol-stats-kv"].put(kvKeys.rawMatches(tournamentName), JSON.stringify(rawMatches));
}

export async function readExistingRawMatchesByName(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const entries = await Promise.all(tournaments.map(async (tournament) => {
    const tournamentName = tournament?.name;
    if (!tournamentName) throw new Error("Tournament tournamentName missing");
    const rawMatches = await env["lol-stats-kv"].get(kvKeys.rawMatches(tournamentName), { type: "json" });
    if (rawMatches == null) return [tournamentName, null];
    assertRawMatches(tournamentName, rawMatches);
    return [tournamentName, rawMatches];
  }));
  return Object.fromEntries(entries);
}

export async function assertRawMatchesAvailable(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  await Promise.all(tournaments.map(tournament => {
    const tournamentName = tournament?.name;
    if (!tournamentName) throw new Error("Tournament tournamentName missing");
    return readRawMatches(env, tournamentName);
  }));
}
