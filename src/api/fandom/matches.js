import { fetchDelayMs, fandomApi } from '../../constants/index.js';
import { cargoStringLiteral } from './cargoQuery.js';

export async function fetchAllMatches(fandomClient, slug, sourceInput) {
  const pages = Array.isArray(sourceInput) ? sourceInput : [sourceInput];
  if (pages.length === 0) throw new Error(`No source pages for ${slug}`);
  const inClause = pages.map((page, index) => cargoStringLiteral(page, `${slug}.overviewPage[${index}]`)).join(", ");
  let all = [];
  let offset = 0;
  const limit = 200;
  const seenIds = new Set();

  while (true) {
    let whereClause = pages.length === 1
      ? `OverviewPage = ${cargoStringLiteral(pages[0], `${slug}.overviewPage[0]`)}`
      : `OverviewPage IN (${inClause})`;

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

    all = all.concat(batch);
    offset += batch.length;

    if (batch.length < limit) break;

    await new Promise(resolveDelay => setTimeout(resolveDelay, fetchDelayMs));
  }

  if (all.length === 0) {
    throw new Error(`[FANDOM:MATCHES] ${slug} returned 0 records`);
  }

  return all;
}
