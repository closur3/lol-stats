function requireGames(match, label) {
  if (!Array.isArray(match.games)) throw new Error(`Missing games: ${label}`);
  return match.games;
}

function validateGame(game, label) {
  if (!game || typeof game !== "object" || Array.isArray(game)) throw new Error(`Invalid game: ${label}`);
  if (typeof game.gameId !== "string" || game.gameId === "") throw new Error(`Invalid game id: ${label}`);
  if (!Number.isInteger(game.number) || game.number < 1) throw new Error(`Invalid game number: ${label}`);
  if (game.winner !== null && game.winner !== 1 && game.winner !== 2) throw new Error(`Invalid game winner: ${label}`);
  if (typeof game.isRemake !== "boolean") throw new Error(`Invalid game remake flag: ${label}`);
  if (typeof game.isChronobreak !== "boolean") throw new Error(`Invalid game chronobreak flag: ${label}`);
}

function resolveGameWinner(game, resolveTeamName, team1Name, team2Name, label) {
  if (game.winner !== 1 && game.winner !== 2) throw new Error(`Invalid game winner: ${label}`);
  const blueName = resolveTeamName(game.blue);
  const redName = resolveTeamName(game.red);
  if (!blueName || !redName || blueName === redName) throw new Error(`Invalid game teams: ${label}`);
  if (!((blueName === team1Name && redName === team2Name) || (blueName === team2Name && redName === team1Name))) {
    throw new Error(`Game teams do not match series: ${label}`);
  }
  return game.winner === 1 ? blueName : redName;
}

function buildOfficialResults(match, resolveTeamName, team1Name, team2Name, label) {
  const games = requireGames(match, label);
  const seenGameIds = new Set();
  games.forEach((game, index) => {
    const gameLabel = `${label}.games[${index}]`;
    validateGame(game, gameLabel);
    if (seenGameIds.has(game.gameId)) throw new Error(`Duplicate game id: ${gameLabel}`);
    seenGameIds.add(game.gameId);
  });
  const officialGames = games.filter(game => !game.isRemake && game.winner !== null);
  const seenNumbers = new Set();
  const team1GameResults = [];
  const team2GameResults = [];

  for (const game of officialGames) {
    const gameLabel = `${label}.games.${game.number}`;
    if (seenNumbers.has(game.number)) throw new Error(`Duplicate official game number: ${gameLabel}`);
    if (game.number !== team1GameResults.length + 1) throw new Error(`Non-sequential official game number: ${gameLabel}`);
    seenNumbers.add(game.number);
    const winnerName = resolveGameWinner(game, resolveTeamName, team1Name, team2Name, gameLabel);
    const team1Won = winnerName === team1Name;
    team1GameResults.push(team1Won ? "W" : "L");
    team2GameResults.push(team1Won ? "L" : "W");
  }

  return { team1GameResults, team2GameResults };
}

function validateFinishedResults(results, team1Score, team2Score, label) {
  const team1Wins = results.team1GameResults.filter(result => result === "W").length;
  const team2Wins = results.team2GameResults.filter(result => result === "W").length;
  if (team1Wins !== team1Score || team2Wins !== team2Score) {
    throw new Error(`Game results do not match series score: ${label} (${team1Wins}-${team2Wins} != ${team1Score}-${team2Score})`);
  }
}

function analyzeTeamTurnaround(gameResults, matchResultCode, bestOf) {
  if ((bestOf !== 3 && bestOf !== 5) || (matchResultCode !== "WIN" && matchResultCode !== "LOSS")) return null;
  const wasBehind = gameResults[0] === "L";
  const wasAhead = gameResults[0] === "W";
  let turnaroundType = null;

  if (matchResultCode === "WIN" && wasBehind) turnaroundType = "leadChange";
  if (matchResultCode === "LOSS" && wasAhead) turnaroundType = "leadChange";
  if (bestOf === 5 && gameResults.join("") === "LLWWW") turnaroundType = "reverseSweep";
  if (bestOf === 5 && gameResults.join("") === "WWLLL") turnaroundType = "reverseSweep";

  return { wasBehind, wasAhead, turnaroundType };
}

export function analyzeGameSequence(match, context) {
  const {
    resolveTeamName,
    team1Name,
    team2Name,
    team1Score,
    team2Score,
    bestOf,
    isFinished,
    isForfeit,
    team1MatchResultCode,
    team2MatchResultCode,
    label
  } = context;
  const results = buildOfficialResults(match, resolveTeamName, team1Name, team2Name, label);

  if (isFinished && !isForfeit) validateFinishedResults(results, team1Score, team2Score, label);
  if (!isFinished || isForfeit) return { ...results, team1Turnaround: null, team2Turnaround: null };

  return {
    ...results,
    team1Turnaround: analyzeTeamTurnaround(results.team1GameResults, team1MatchResultCode, bestOf),
    team2Turnaround: analyzeTeamTurnaround(results.team2GameResults, team2MatchResultCode, bestOf)
  };
}

export function applyTurnaroundStats(teamStats, turnaround, matchResultCode) {
  if (turnaround === null) return;
  if (turnaround.wasBehind) {
    teamStats.seriesTrailedCount++;
    if (matchResultCode === "WIN") teamStats.comebackCount++;
  }
  if (turnaround.wasAhead) {
    teamStats.seriesLedCount++;
    if (matchResultCode === "LOSS") teamStats.lostLeadCount++;
  }
  if (turnaround.turnaroundType === "reverseSweep") {
    if (matchResultCode === "WIN") teamStats.reverseSweepCount++;
    if (matchResultCode === "LOSS") teamStats.reverseSweptCount++;
  }
}
