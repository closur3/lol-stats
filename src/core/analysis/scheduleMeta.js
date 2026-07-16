import { timePolicy } from '../../utils/timePolicy.js';
import { parseMatchOutcome } from './matchFields.js';
import { readScheduleIdentity } from '../scheduleIdentity.js';

function buildSession(overviewPage, tab, matchDay, matchNumber, timestamp, dateKey, unfinished) {
  return {
    overviewPage,
    tab,
    matchDay,
    firstMatchNumber: matchNumber,
    lastMatchNumber: matchNumber,
    startTimestamp: timestamp,
    lastMatchTimestamp: timestamp,
    matchCount: 1,
    unfinishedCount: unfinished ? 1 : 0,
    matchDates: [dateKey],
    unfinishedDates: unfinished ? [dateKey] : []
  };
}

function appendMatch(session, matchNumber, timestamp, dateKey, unfinished) {
  session.firstMatchNumber = Math.min(session.firstMatchNumber, matchNumber);
  session.lastMatchNumber = Math.max(session.lastMatchNumber, matchNumber);
  session.startTimestamp = Math.min(session.startTimestamp, timestamp);
  session.lastMatchTimestamp = Math.max(session.lastMatchTimestamp, timestamp);
  session.matchCount++;
  if (!session.matchDates.includes(dateKey)) session.matchDates.push(dateKey);
  if (unfinished) {
    session.unfinishedCount++;
    if (!session.unfinishedDates.includes(dateKey)) session.unfinishedDates.push(dateKey);
  }
}

function finalizeSession(session) {
  session.matchDates.sort();
  session.unfinishedDates.sort();
  return session;
}

export function computeScheduleMetaFromRawMatches(rawMatches) {
  if (!Array.isArray(rawMatches)) throw new Error("rawMatches must be an array");
  const sessions = new Map();
  const matchNumbersByTab = new Map();

  rawMatches.forEach((rawMatch, sourceIndex) => {
    if (!rawMatch || typeof rawMatch !== "object" || Array.isArray(rawMatch)) {
      throw new Error(`RawMatches[${sourceIndex}] must be a JSON object`);
    }
    const label = `RawMatches.${rawMatch.MatchId || sourceIndex}`;
    const { winner, isNullified } = parseMatchOutcome(rawMatch, label);
    if (isNullified) return;

    const { overviewPage, tab, matchDay, matchNumber, sessionKey } = readScheduleIdentity(rawMatch, label);
    const matchTime = timePolicy.deriveMatchTime(rawMatch.DateTimeUTC);
    const tabKey = JSON.stringify([overviewPage, tab]);
    if (!matchNumbersByTab.has(tabKey)) matchNumbersByTab.set(tabKey, new Set());
    const usedNumbers = matchNumbersByTab.get(tabKey);
    if (usedNumbers.has(matchNumber)) {
      throw new Error(`${label}.nMatchInTab duplicates ${matchNumber} in ${overviewPage}/${tab}`);
    }
    usedNumbers.add(matchNumber);

    const unfinished = winner === null;
    if (!sessions.has(sessionKey)) {
      sessions.set(sessionKey, buildSession(overviewPage, tab, matchDay, matchNumber, matchTime.timestamp, matchTime.matchDateStr, unfinished));
      return;
    }
    appendMatch(sessions.get(sessionKey), matchNumber, matchTime.timestamp, matchTime.matchDateStr, unfinished);
  });

  return {
    sessions: Array.from(sessions.values())
      .sort((left, right) => left.startTimestamp - right.startTimestamp || left.overviewPage.localeCompare(right.overviewPage) || left.tab.localeCompare(right.tab) || left.matchDay - right.matchDay)
      .map(finalizeSession)
  };
}

export function collectRetainedPastScheduleDates(meta, today) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta) || !Array.isArray(meta.sessions)) {
    throw new Error("ScheduleMeta.sessions must be an array");
  }
  if (typeof today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new Error("today must be an app date key");
  }
  const retainedDates = new Set();
  for (const [index, session] of meta.sessions.entries()) {
    if (!Array.isArray(session.matchDates) || !Array.isArray(session.unfinishedDates)) {
      throw new Error(`ScheduleMeta.sessions[${index}] dates missing`);
    }
    for (const date of session.unfinishedDates) {
      if (date < today) retainedDates.add(date);
    }
    if (session.matchDates.includes(today)) {
      for (const date of session.matchDates) {
        if (date < today) retainedDates.add(date);
      }
    }
  }
  return retainedDates;
}
