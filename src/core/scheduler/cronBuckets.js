import { assertSlugScheduleState, hasPlayWindow, isNowInPlayWindow } from "./scheduleState.js";
import { timePolicy } from "../../utils/timePolicy.js";

export const baselineCron = "0 */2 * * *";

const maxActiveCrons = 4;
const maxTotalCrons = 5;
const cronDayOrder = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function toActiveCron(startHour, endHour, day) {
  return `2-58/2 ${startHour}-${endHour} * * ${day}`;
}

function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => cronDayOrder[a.day] - cronDayOrder[b.day] || a.startHour - b.startHour || a.endHour - b.endHour);
  const merged = [];

  for (const interval of sorted) {
    const last = merged.at(-1);
    if (!last || last.day !== interval.day || interval.startHour > last.endHour + 1) {
      merged.push({ day: interval.day, startHour: interval.startHour, endHour: interval.endHour });
      continue;
    }
    last.endHour = Math.max(last.endHour, interval.endHour);
  }

  while (merged.length > maxActiveCrons) {
    let mergeIndex = 0;
    let bestGap = Infinity;
    for (let index = 0; index < merged.length - 1; index++) {
      if (merged[index].day !== merged[index + 1].day) continue;
      const gap = merged[index + 1].startHour - merged[index].endHour - 1;
      if (gap < bestGap) {
        bestGap = gap;
        mergeIndex = index;
      }
    }
    if (bestGap === Infinity) {
      throw new Error(`Cloudflare active cron limit exceeded: ${merged.length}/${maxActiveCrons}`);
    }
    merged.splice(mergeIndex, 2, {
      day: merged[mergeIndex].day,
      startHour: merged[mergeIndex].startHour,
      endHour: Math.max(merged[mergeIndex].endHour, merged[mergeIndex + 1].endHour)
    });
  }

  return merged;
}

export function buildActiveBucketCronsFromState(state) {
  if (!state?.slugStates || typeof state.slugStates !== "object" || Array.isArray(state.slugStates)) {
    throw new Error("ScheduleState.slugStates must be a JSON object");
  }
  const intervals = [];
  for (const [slug, slugState] of Object.entries(state.slugStates)) {
    assertSlugScheduleState(slug, slugState);
    if (!hasPlayWindow(slugState)) continue;
    intervals.push(...timePolicy.appWindowToUtcCronSegments(state.date, slugState.playStartHour, slugState.playEndHour));
  }

  const buckets = mergeIntervals(intervals);
  return buckets.map(bucket => toActiveCron(bucket.startHour, bucket.endHour, bucket.day));
}

export function buildCronsFromScheduleState(state) {
  const activeCrons = buildActiveBucketCronsFromState(state);
  const schedules = Array.from(new Set([baselineCron, ...activeCrons]));
  if (schedules.length > maxTotalCrons) {
    throw new Error(`Cloudflare cron limit exceeded: ${schedules.length}/${maxTotalCrons}`);
  }
  return schedules;
}

export function shouldRunPlaySlugAt(slugState, nowUtc) {
  if (!hasPlayWindow(slugState)) return false;
  return isNowInPlayWindow(slugState, nowUtc);
}
