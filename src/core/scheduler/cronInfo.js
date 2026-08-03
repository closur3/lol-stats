import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { baselineCron } from "./cronBuckets.js";
import { readScheduleState, ScheduleStateSchemaError } from "./scheduleState.js";

const weekdayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function padHour(hour) {
  return String(hour).padStart(2, "0");
}

function formatCstSchedule(expression) {
  if (expression === baselineCron) {
    return { period: "Daily", timeRange: "00:00–22:00", frequency: "every 2 hours" };
  }
  const match = expression.match(/^2-58\/2 (\d{1,2})-(\d{1,2}) \* \* (sun|mon|tue|wed|thu|fri|sat)$/);
  if (!match) throw new Error(`Unsupported applied Cron expression: ${expression}`);
  const startUtcHour = Number(match[1]);
  const endUtcHour = Number(match[2]);
  const utcWeekday = weekdayNames.indexOf(match[3]);
  if (startUtcHour > endUtcHour || endUtcHour > 23 || utcWeekday < 0) {
    throw new Error(`Invalid applied Cron expression: ${expression}`);
  }
  const startDayOffset = Math.floor((startUtcHour + 8) / 24);
  const endDayOffset = Math.floor((endUtcHour + 8) / 24);
  if (startDayOffset !== endDayOffset) throw new Error(`Applied Cron crosses a CST day boundary: ${expression}`);
  const cstWeekday = weekdayLabels[(utcWeekday + startDayOffset) % weekdayLabels.length];
  const startCstHour = (startUtcHour + 8) % 24;
  const endCstHour = (endUtcHour + 8) % 24;
  return {
    period: cstWeekday,
    timeRange: `${padHour(startCstHour)}:02–${padHour(endCstHour)}:58`,
    frequency: "every 2 minutes"
  };
}

export function assertCronInfo(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("cronInfo must be a JSON object");
  const fields = Object.keys(value);
  if (fields.length !== 2 || !Object.hasOwn(value, "status") || !Object.hasOwn(value, "schedules")) {
    throw new Error("cronInfo fields must be status and schedules");
  }
  if (!["active", "idle", "unavailable"].includes(value.status)) throw new Error("cronInfo.status invalid");
  if (!Array.isArray(value.schedules)) throw new Error("cronInfo.schedules must be an array");
  if (value.status === "unavailable" && value.schedules.length !== 0) {
    throw new Error("Unavailable cronInfo must not contain schedules");
  }
  for (const [index, schedule] of value.schedules.entries()) {
    if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
      throw new Error(`cronInfo.schedules[${index}] must be a JSON object`);
    }
    const scheduleFields = Object.keys(schedule);
    if (scheduleFields.length !== 2 || !Object.hasOwn(schedule, "expression") || !Object.hasOwn(schedule, "cst")) {
      throw new Error(`cronInfo.schedules[${index}] fields must be expression and cst`);
    }
    if (typeof schedule.expression !== "string" || !schedule.expression) {
      throw new Error(`cronInfo.schedules[${index}].expression invalid`);
    }
    if (!schedule.cst || typeof schedule.cst !== "object" || Array.isArray(schedule.cst)) {
      throw new Error(`cronInfo.schedules[${index}].cst must be a JSON object`);
    }
    const cstFields = Object.keys(schedule.cst);
    if (cstFields.length !== 3 || !Object.hasOwn(schedule.cst, "period") || !Object.hasOwn(schedule.cst, "timeRange") || !Object.hasOwn(schedule.cst, "frequency")) {
      throw new Error(`cronInfo.schedules[${index}].cst fields must be period, timeRange and frequency`);
    }
    if ([schedule.cst.period, schedule.cst.timeRange, schedule.cst.frequency].some(value => typeof value !== "string" || !value)) {
      throw new Error(`cronInfo.schedules[${index}].cst values invalid`);
    }
  }
  return value;
}

export function buildCronInfo(appliedCrons) {
  if (!Array.isArray(appliedCrons) || appliedCrons.some(expression => typeof expression !== "string" || !expression)) {
    throw new Error("appliedCrons must be an array of Cron expressions");
  }
  return assertCronInfo({
    status: appliedCrons.some(expression => expression !== baselineCron) ? "active" : "idle",
    schedules: appliedCrons.map(expression => ({ expression, cst: formatCstSchedule(expression) }))
  });
}

export function unavailableCronInfo() {
  return { status: "unavailable", schedules: [] };
}

export async function readCronInfo(env) {
  try {
    const state = await readScheduleState(env);
    if (state === null) {
      console.error(`[CRON:INFO] unavailable: ${kvKeys.scheduleState()} missing`);
      return unavailableCronInfo();
    }
    return buildCronInfo(state.appliedCrons);
  } catch (error) {
    if (!(error instanceof ScheduleStateSchemaError)) throw error;
    console.error(`[CRON:INFO] unavailable: ${error.message}`);
    return unavailableCronInfo();
  }
}
