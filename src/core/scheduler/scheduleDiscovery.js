import { FandomClient } from "../../api/fandomClient.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { dataUtils } from "../../utils/dataUtils.js";
import { timePolicy } from "../../utils/timePolicy.js";

export async function loginFandom(env) {
  return FandomClient.login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
}

export async function fetchTodayMatchesForBusinessDate(tournaments, fandomClient, targetDate) {
  const dateStr = timePolicy.getBusinessDateKey(targetDate);
  const utcDateKeys = timePolicy.getUtcDateKeysForBusinessDate(dateStr);
  const bySlug = new Map();
  for (const tournament of tournaments || []) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    const pages = dataUtils.normalizeOverviewPages(tournament.overview_page);
    if (!pages.length) throw new Error(`overview_page missing: ${slug}`);
    const matchesById = new Map();
    const dailyMatches = await Promise.all(utcDateKeys.map(utcDateKey =>
      fandomClient.fetchAllMatches(slug, pages, { start: utcDateKey, end: utcDateKey })
    ));
    for (const matches of dailyMatches) {
      for (const match of matches) {
        if (!timePolicy.isUtcMatchOnBusinessDate(match.DateTimeUTC, dateStr)) continue;
        const key = match.MatchId != null ? String(match.MatchId) : JSON.stringify(match);
        matchesById.set(key, match);
      }
    }
    bySlug.set(slug, Array.from(matchesById.values()));
  }
  return bySlug;
}

export async function fetchTournamentMetasFromHome(env, tournaments) {
  const kv = env["lol-stats-kv"];
  const entries = await Promise.all((tournaments || []).map(async (tournament) => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    const home = await kv.get(kvKeys.home(slug), { type: "json" });
    const meta = home?.tournament || {};
    return {
      slug,
      todayEarliestTimestamp: Number(meta.todayEarliestTimestamp) || 0,
      todayUnfinished: Number(meta.todayUnfinished) || 0,
      hasHistoryUnfinished: !!meta.hasHistoryUnfinished
    };
  }));
  return entries;
}

export function buildPlayWindow(matches, meta) {
  let earliest = null;
  for (const match of matches || []) {
    const raw = match?.DateTimeUTC;
    if (!raw) continue;
    const dt = timePolicy.parseUtcDateTime(raw);
    if (!earliest || dt < earliest) earliest = dt;
  }

  const metaEarliest = Number(meta?.todayEarliestTimestamp) || 0;
  if (!earliest && metaEarliest > 0) earliest = new Date(metaEarliest);

  const hasCarryoverUnfinished = !!meta?.hasHistoryUnfinished;
  if (!earliest && !hasCarryoverUnfinished) return null;

  return {
    startHour: hasCarryoverUnfinished ? 0 : timePolicy.getBusinessHour(earliest),
    endHour: 23
  };
}

export function buildWindowFromMeta(meta) {
  const hasCarryoverUnfinished = !!meta?.hasHistoryUnfinished;
  const earliest = Number(meta?.todayEarliestTimestamp) || 0;
  if (!hasCarryoverUnfinished && !earliest) return null;
  return {
    startHour: hasCarryoverUnfinished ? 0 : timePolicy.getBusinessHour(earliest),
    endHour: 23
  };
}
