const appTimeZoneOffsetHours = 8;

const weekdayCronNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekdayDisplayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const appTimeZoneOffsetMs = appTimeZoneOffsetHours * 60 * 60 * 1000;
const pad2 = (value) => String(value).padStart(2, "0");

function parseAppDateKey(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid app date key: ${dateKey}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function parseUtcDateTime(raw) {
  if (!raw) throw new Error(`Invalid DateTimeUTC: ${raw}`);
  const normalized = String(raw).includes("T")
    ? String(raw)
    : String(raw).replace(" ", "T");
  const date = new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid DateTimeUTC: ${raw}`);
  return date;
}

function getAppTimeParts(timestampInput = new Date()) {
  const date = timestampInput instanceof Date ? timestampInput : new Date(timestampInput);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp: ${timestampInput}`);

  const appDate = new Date(date.getTime() + appTimeZoneOffsetMs);
  const yearNumber = appDate.getUTCFullYear();
  const monthNumber = appDate.getUTCMonth() + 1;
  const dayNumber = appDate.getUTCDate();
  const hourNumber = appDate.getUTCHours();
  const minuteNumber = appDate.getUTCMinutes();
  const secondNumber = appDate.getUTCSeconds();
  const year = String(yearNumber);
  const month = pad2(monthNumber);
  const day = pad2(dayNumber);
  const hour = pad2(hourNumber);
  const minute = pad2(minuteNumber);
  const second = pad2(secondNumber);
  const weekdayUtc = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber)).getUTCDay();
  return {
    year,
    month,
    dayOfMonth: day,
    hour,
    minute,
    second,
    hourNumber,
    minuteNumber,
    secondNumber,
    weekday: weekdayUtc,
    weekdayIndex: weekdayUtc === 0 ? 6 : weekdayUtc - 1,
    dateKey: `${year}-${month}-${day}`,
    timeText: `${hour}:${minute}`,
    dateDisplay: `${month}-${day} ${hour}:${minute}`,
    fullDateDisplay: `${year}-${month}-${day}`
  };
}

function buildAppDateUtcDate(dateKey, hour = 0) {
  const { year, month, day } = parseAppDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, hour - appTimeZoneOffsetHours, 0, 0));
}

export const timePolicy = {
  parseUtcDateTime,

  getAppTimeParts,

  getCurrentAppDateTime(timestampInput = new Date()) {
    const date = timestampInput instanceof Date ? timestampInput : new Date(timestampInput);
    const parts = getAppTimeParts(date);
    const fullDateTimeString = `${parts.fullDateDisplay} ${parts.hour}:${parts.minute}:${parts.second}`;
    return {
      dateTime: date,
      isoString: date.toISOString(),
      fullDateTimeString,
      dateString: parts.dateKey,
      timeString: `${parts.hour}:${parts.minute}:${parts.second}`,
      timestamp: date.getTime()
    };
  },

  deriveMatchTime(rawDateTimeUtc) {
    const date = parseUtcDateTime(rawDateTimeUtc);
    const parts = getAppTimeParts(date);
    const timeMinutes = parts.hourNumber * 60 + parts.minuteNumber;
    return {
      date,
      timestamp: date.getTime(),
      dateDisplay: parts.dateDisplay,
      fullDateDisplay: parts.fullDateDisplay,
      matchDateStr: parts.dateKey,
      matchTimeStr: parts.timeText,
      weekdayIndex: parts.weekdayIndex,
      hour: parts.hourNumber,
      minute: parts.minuteNumber,
      timeMinutes,
      roundedMinutes: Math.round(timeMinutes / 60) * 60
    };
  },

  formatDateTime(timestamp) {
    if (!timestamp) return "(Pending)";
    const parts = getAppTimeParts(timestamp);
    return `${parts.year}-${parts.month}-${parts.dayOfMonth} ${parts.hour}:${parts.minute}`;
  },

  getWeekdayName(dateKey) {
    const { year, month, day } = parseAppDateKey(dateKey);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return weekdayDisplayNames[weekday];
  },

  getAppHour(timestampInput = new Date()) {
    return getAppTimeParts(timestampInput).hourNumber;
  },

  getAppDateKey(timestampInput = new Date()) {
    return getAppTimeParts(timestampInput).dateKey;
  },

  getCoveredUtcDateKeysForAppDate(dateKey) {
    const start = buildAppDateUtcDate(dateKey, 0);
    const end = buildAppDateUtcDate(dateKey, 23);
    return Array.from(new Set([
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10)
    ])).sort();
  },

  isUtcMatchOnAppDate(rawDateTimeUtc, dateKey) {
    return getAppTimeParts(parseUtcDateTime(rawDateTimeUtc)).dateKey === dateKey;
  },

  appWindowToUtcCronSegments(dateKey, startHour, endHour) {
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 || startHour > endHour) {
      throw new Error(`Invalid app play window: ${startHour}-${endHour}`);
    }

    const segments = [];
    for (let appHour = startHour; appHour <= endHour; appHour++) {
      const utcDate = buildAppDateUtcDate(dateKey, appHour);
      const day = weekdayCronNames[utcDate.getUTCDay()];
      const hour = utcDate.getUTCHours();
      const last = segments.at(-1);
      if (last && last.day === day && last.endHour + 1 === hour) {
        last.endHour = hour;
      } else {
        segments.push({ day, startHour: hour, endHour: hour });
      }
    }
    return segments;
  }
};
