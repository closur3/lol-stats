import { timePolicy } from '../../utils/timePolicy.js';
import { parseMatchBestOf } from './matchFields.js';

export function computeScheduleMetaFromRawMatches(rawMatches) {
  if (!Array.isArray(rawMatches)) throw new Error("rawMatches must be an array");
  const todayStr = timePolicy.getCurrentAppDateTime().dateString;
  let todayEarliest = 0;
  let todayUnfinished = 0;
  let hasHistoryUnfinished = false;

  for (const match of rawMatches) {
    const matchTime = timePolicy.deriveMatchTime(match.DateTimeUTC);
    const dateStr = matchTime.matchDateStr;
    const ts = matchTime.timestamp;

    if (dateStr === todayStr && ts && (!todayEarliest || ts < todayEarliest)) {
      todayEarliest = ts;
    }

    const team1Score = Number.parseInt(match.Team1Score, 10) || 0;
    const team2Score = Number.parseInt(match.Team2Score, 10) || 0;
    const bestOf = parseMatchBestOf(match.BestOf, `ScheduleMeta.${match.MatchId}.BestOf`);
    const isFinished = Math.max(team1Score, team2Score) >= Math.ceil(bestOf / 2);
    if (isFinished) continue;

    if (dateStr === todayStr) {
      todayUnfinished++;
    } else if (dateStr < todayStr) {
      hasHistoryUnfinished = true;
    }
  }

  return { todayEarliestTimestamp: todayEarliest, todayUnfinished, hasHistoryUnfinished };
}
