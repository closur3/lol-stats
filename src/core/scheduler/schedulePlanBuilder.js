import { timePolicy } from "../../utils/timePolicy.js";
import { assertScheduleMetaFields } from "../facts/scheduleMetaStore.js";

export function requireScheduleMeta(metasBySlug, slug) {
  const meta = metasBySlug.get(slug);
  if (!meta) throw new Error(`ScheduleMeta missing after load: ${slug}`);
  return meta;
}

function buildSessionReference(session) {
  if (!session) return null;
  return {
    overviewPage: session.overviewPage,
    tab: session.tab,
    matchDay: session.matchDay,
    startTimestamp: session.startTimestamp
  };
}

export function deriveSlugScheduleState(meta, nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid scheduler timestamp: ${nowInput}`);
  const { sessions } = assertScheduleMetaFields("ScheduleMeta", meta);
  const today = timePolicy.getAppDateKey(now);
  const target = sessions.find(session => session.unfinishedCount > 0) || null;
  const hasMatchesToday = sessions.some(session => session.matchDates.includes(today));

  if (!target) {
    return {
      phase: hasMatchesToday ? "done" : "offday",
      targetSession: null,
      cronWindow: null
    };
  }

  const targetDate = timePolicy.getAppDateKey(target.startTimestamp);
  if (targetDate > today) {
    return {
      phase: hasMatchesToday ? "done" : "offday",
      targetSession: buildSessionReference(target),
      cronWindow: null
    };
  }

  const startHour = targetDate < today ? 0 : timePolicy.getAppHour(target.startTimestamp);
  return {
    phase: now.getTime() < target.startTimestamp ? "idle" : "play",
    targetSession: buildSessionReference(target),
    cronWindow: { startHour, endHour: 23 }
  };
}

export function resolveSchedulePhase(meta, nowInput = new Date()) {
  return deriveSlugScheduleState(meta, nowInput).phase;
}

export function buildScheduleState(tournaments, metasBySlug, nowInput, appliedCrons = []) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  if (!(metasBySlug instanceof Map)) throw new Error("metasBySlug must be a Map");
  if (!Array.isArray(appliedCrons)) throw new Error("appliedCrons must be an array");
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const slugStates = {};
  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    slugStates[slug] = deriveSlugScheduleState(requireScheduleMeta(metasBySlug, slug), now);
  }
  return {
    date: timePolicy.getAppDateKey(now),
    slugStates,
    appliedCrons: [...appliedCrons]
  };
}
