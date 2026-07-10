import { timePolicy } from '../../utils/timePolicy.js';
import { parseMatchWinner } from './matchFields.js';

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

    const winner = parseMatchWinner(match.Winner, `ScheduleMeta.${match.MatchId}.Winner`);
    const isFinished = winner !== null;
    if (isFinished) continue;

    if (dateStr === todayStr) {
      todayUnfinished++;
    } else if (dateStr < todayStr) {
      hasHistoryUnfinished = true;
    }
  }

  return { todayEarliestTimestamp: todayEarliest, todayUnfinished, hasHistoryUnfinished };
}
