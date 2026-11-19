import { assertScheduleControl, isNowInCronWindow } from "./scheduleState.js";
import { timePolicy } from "../../utils/timePolicy.js";

export const everyTwoHoursBaselineCron = "0 */2 * * *";
// 00:00 CST: the app day boundary and the same minute as the daily Config sync.
// Overlapping runs are safe: a stale schedule write aborts in assertCurrentActiveScope.
export const dailyBaselineCron = "0 16 * * *";

const baselineCrons = [everyTwoHoursBaselineCron, dailyBaselineCron];
const maxActiveCrons = 4;
const maxTotalCrons = 5;
const cronDayOrder = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function toActiveCron(startHour, endHour, day) {
  return `2-58/2 ${startHour}-${endHour} * * ${day}`;
}

export function isBaselineCron(expression) {
  return baselineCrons.includes(expression);
}

function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((leftInterval, rightInterval) => cronDayOrder[leftInterval.day] - cronDayOrder[rightInterval.day] || leftInterval.startHour - rightInterval.startHour || leftInterval.endHour - rightInterval.endHour);
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
  if (!state?.controlsByName || typeof state.controlsByName !== "object" || Array.isArray(state.controlsByName)) {
    throw new Error("ScheduleState.controlsByName must be a JSON object");
  }
  const intervals = [];
  for (const [tournamentName, control] of Object.entries(state.controlsByName)) {
    assertScheduleControl(tournamentName, control);
    if (control.cronWindow === null) continue;
    intervals.push(...timePolicy.appWindowToUtcCronSegments(state.date, control.cronWindow.startHour, control.cronWindow.endHour));
  }

  const buckets = mergeIntervals(intervals);
  return buckets.map(bucket => toActiveCron(bucket.startHour, bucket.endHour, bucket.day));
}

export function buildCronsFromScheduleState(state, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const activeCrons = buildActiveBucketCronsFromState(state);
  const controlCount = Object.keys(state.controlsByName).length;
  if (controlCount !== tournaments.length) {
    throw new Error(`ScheduleState scope does not match tournaments: ${controlCount}/${tournaments.length}`);
  }
  if (activeCrons.some(isBaselineCron)) {
    throw new Error("Active cron must not collide with a baseline cron");
  }
  const baseline = tournaments.length === 0 ? dailyBaselineCron : everyTwoHoursBaselineCron;
  const schedules = Array.from(new Set([baseline, ...activeCrons]));
  if (schedules.length > maxTotalCrons) {
    throw new Error(`Cloudflare cron limit exceeded: ${schedules.length}/${maxTotalCrons}`);
  }
  return schedules;
}

export function shouldRunScheduledTournamentAt(control, nowUtc) {
  return isNowInCronWindow(control, nowUtc);
}
