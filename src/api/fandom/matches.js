import { fetchDelayMs, fandomApi } from '../../constants/index.js';
import { cargoStringLiteral } from './cargoQuery.js';

function hasScheduledDateTime(match) {
  return typeof match.DateTimeUTC === 'string' && match.DateTimeUTC.trim().length > 0;
}

function buildOverviewPages(slug, sourceInput) {
  const pages = Array.isArray(sourceInput) ? sourceInput : [sourceInput];
  if (pages.length === 0) throw new Error(`No source pages for ${slug}`);
  pages.forEach((page, index) => cargoStringLiteral(page, `${slug}.overviewPage[${index}]`));
  return pages;
}

function buildOverviewWhere(slug, pages, fieldName = "OverviewPage") {
  const inClause = pages.map((page, index) => cargoStringLiteral(page, `${slug}.overviewPage[${index}]`)).join(", ");
  return pages.length === 1
    ? `${fieldName} = ${cargoStringLiteral(pages[0], `${slug}.overviewPage[0]`)}`
    : `${fieldName} IN (${inClause})`;
}

async function fetchMatchSchedule(fandomClient, slug, pages) {
  let all = [];
  let offset = 0;
  const limit = 200;
  const seenIds = new Set();
  let unscheduledCount = 0;
  const whereClause = buildOverviewWhere(slug, pages);

  while (true) {
    const cargoParams = new URLSearchParams({
      action: "cargoquery",
      format: "json",
      tables: "MatchSchedule",
      fields: "Team1,Team2,Winner,Team1Score,Team2Score,FF,IsNullified,DateTime_UTC=DateTimeUTC,OverviewPage,BestOf,Tab,MatchId",
      where: whereClause,
      limit: limit.toString(),
      offset: offset.toString(),
      order_by: "DateTime_UTC ASC",
      maxlag: "1"
    });

    const batchRaw = await fandomClient.fetchWithRetry(`${fandomApi}?${cargoParams}`);
    const batch = batchRaw.map(record => record.title);

    if (!batch.length) break;

    const hasDuplicates = batch.some(record => {
      const matchId = record.MatchId;
      if (matchId != null && seenIds.has(String(matchId))) return true;
      if (matchId != null) seenIds.add(String(matchId));
      return false;
    });

    if (hasDuplicates) {
      throw new Error(`[FANDOM:MATCHES] ${slug} duplicate MatchId, aborting to prevent infinite loop`);
    }

    const scheduledBatch = batch.filter(hasScheduledDateTime);
    unscheduledCount += batch.length - scheduledBatch.length;
    all = all.concat(scheduledBatch);
    offset += batch.length;

    if (batch.length < limit) break;

    await new Promise(resolveDelay => setTimeout(resolveDelay, fetchDelayMs));
  }

  if (all.length === 0) {
    throw new Error(`[FANDOM:MATCHES] ${slug} returned 0 scheduled records`);
  }

  if (unscheduledCount > 0) {
    console.log(`[FANDOM:MATCHES] ${slug} skipped unscheduled=${unscheduledCount}`);
  }

  return all;
}

function parseOptionalInteger(value, label, allowedValues) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || (allowedValues && !allowedValues.includes(parsed))) {
    throw new Error(`Invalid ${label}`);
  }
  return parsed;
}

function parseCargoBoolean(value, label) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0" || value === "" || value === null || value === undefined) return false;
  throw new Error(`Invalid ${label}`);
}

function requireGameText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing ${label}`);
  return value;
}

function parseMatchScheduleGame(record, slug) {
  const matchId = record.MatchId;
  if (matchId === "" || matchId === null || matchId === undefined) {
    throw new Error(`[FANDOM:GAMES] ${slug} missing MatchId`);
  }
  const number = Number.parseInt(record.N_GameInMatch, 10);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`[FANDOM:GAMES] ${slug}.${matchId} invalid N_GameInMatch`);
  }
  const label = `${slug}.${matchId}.${number}`;
  const winner = parseOptionalInteger(record.Winner, `${label}.Winner`, [1, 2]);
  const blue = winner === null ? record.Blue : requireGameText(record.Blue, `${label}.Blue`);
  const red = winner === null ? record.Red : requireGameText(record.Red, `${label}.Red`);
  const blueScore = parseOptionalInteger(record.BlueScore, `${label}.BlueScore`);
  const redScore = parseOptionalInteger(record.RedScore, `${label}.RedScore`);
  if (blueScore !== null && blueScore < 0) throw new Error(`Invalid ${label}.BlueScore`);
  if (redScore !== null && redScore < 0) throw new Error(`Invalid ${label}.RedScore`);

  return {
    matchId: String(matchId),
    gameId: requireGameText(record.GameId, `${label}.GameId`),
    number,
    blue: blue || null,
    red: red || null,
    winner,
    blueScore,
    redScore,
    forfeitSide: parseOptionalInteger(record.FF, `${label}.FF`, [0, 1, 2]),
    isRemake: parseCargoBoolean(record.IsRemake, `${label}.IsRemake`),
    isChronobreak: parseCargoBoolean(record.IsChronobreak, `${label}.IsChronobreak`)
  };
}

async function fetchMatchScheduleGames(fandomClient, slug, pages) {
  const all = [];
  const seenGameIds = new Set();
  const whereClause = buildOverviewWhere(slug, pages, "MS.OverviewPage");
  let offset = 0;
  const limit = 500;

  while (true) {
    const cargoParams = new URLSearchParams({
      action: "cargoquery",
      format: "json",
      tables: "MatchSchedule=MS,MatchScheduleGame=MSG",
      fields: "MS.MatchId=MatchId,MSG.GameId=GameId,MSG.N_GameInMatch=N_GameInMatch,MSG.Blue=Blue,MSG.Red=Red,MSG.Winner=Winner,MSG.BlueScore=BlueScore,MSG.RedScore=RedScore,MSG.FF=FF,MSG.IsRemake=IsRemake,MSG.IsChronobreak=IsChronobreak",
      join_on: "MS.MatchId=MSG.MatchId",
      where: whereClause,
      limit: limit.toString(),
      offset: offset.toString(),
      order_by: "MS.MatchId ASC,MSG.N_GameInMatch ASC,MSG.GameId ASC",
      maxlag: "1"
    });

    const batchRaw = await fandomClient.fetchWithRetry(`${fandomApi}?${cargoParams}`);
    const batch = batchRaw.map(record => parseMatchScheduleGame(record.title, slug));
    if (batch.length === 0) break;

    for (const game of batch) {
      if (seenGameIds.has(game.gameId)) {
        throw new Error(`[FANDOM:GAMES] ${slug} duplicate GameId: ${game.gameId}`);
      }
      seenGameIds.add(game.gameId);
      all.push(game);
    }

    offset += batch.length;
    if (batch.length < limit) break;
    await new Promise(resolveDelay => setTimeout(resolveDelay, fetchDelayMs));
  }

  return all;
}

function attachGames(matches, matchScheduleGames, slug) {
  const matchIds = new Set(matches.map(match => String(match.MatchId)));
  const gamesByMatchId = new Map();
  let ignoredGames = 0;

  for (const game of matchScheduleGames) {
    if (!matchIds.has(game.matchId)) {
      ignoredGames++;
      continue;
    }
    if (!gamesByMatchId.has(game.matchId)) gamesByMatchId.set(game.matchId, []);
    gamesByMatchId.get(game.matchId).push({
      gameId: game.gameId,
      number: game.number,
      blue: game.blue,
      red: game.red,
      winner: game.winner,
      blueScore: game.blueScore,
      redScore: game.redScore,
      forfeitSide: game.forfeitSide,
      isRemake: game.isRemake,
      isChronobreak: game.isChronobreak
    });
  }

  if (ignoredGames > 0) {
    console.log(`[FANDOM:GAMES] ${slug} ignored games outside scheduled matches=${ignoredGames}`);
  }

  return matches.map(match => ({
    ...match,
    games: gamesByMatchId.get(String(match.MatchId)) || []
  }));
}

export async function fetchAllMatches(fandomClient, slug, sourceInput) {
  const pages = buildOverviewPages(slug, sourceInput);
  const [matches, matchScheduleGames] = await Promise.all([
    fetchMatchSchedule(fandomClient, slug, pages),
    fetchMatchScheduleGames(fandomClient, slug, pages)
  ]);
  return attachGames(matches, matchScheduleGames, slug);
}
