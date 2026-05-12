export const BUSINESS_TIME_ZONE = "Asia/Shanghai";
export const BUSINESS_UTC_OFFSET_HOURS = 8;

const WEEKDAY_CRON_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_DISPLAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseBusinessDateKey(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid business date key: ${dateKey}`);
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

function getBusinessParts(timestampInput = new Date()) {
  const date = timestampInput instanceof Date ? timestampInput : new Date(timestampInput);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp: ${timestampInput}`);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute || !parts.second) {
    throw new Error(`Cannot derive business time parts: ${date.toISOString()}`);
  }

  const weekdayUtc = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))).getUTCDay();
  return {
    year: parts.year,
    month: parts.month,
    dayOfMonth: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    hourNumber: Number(parts.hour),
    minuteNumber: Number(parts.minute),
    secondNumber: Number(parts.second),
    weekday: weekdayUtc,
    weekdayIndex: weekdayUtc === 0 ? 6 : weekdayUtc - 1,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    timeText: `${parts.hour}:${parts.minute}`,
    dateDisplay: `${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`,
    fullDateDisplay: `${parts.year}-${parts.month}-${parts.day}`
  };
}

function buildBusinessDateUtcDate(dateKey, hour = 0) {
  const { year, month, day } = parseBusinessDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, hour - BUSINESS_UTC_OFFSET_HOURS, 0, 0));
}

export const timePolicy = {
  parseUtcDateTime,

  getBusinessParts,

  getNow(timestampInput = new Date()) {
    const date = timestampInput instanceof Date ? timestampInput : new Date(timestampInput);
    const parts = getBusinessParts(date);
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
    const parts = getBusinessParts(date);
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
    const parts = getBusinessParts(timestamp);
    return `${parts.year}-${parts.month}-${parts.dayOfMonth} ${parts.hour}:${parts.minute}`;
  },

  getWeekdayName(dateKey) {
    const { year, month, day } = parseBusinessDateKey(dateKey);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return WEEKDAY_DISPLAY_NAMES[weekday];
  },

  getBusinessHour(timestampInput = new Date()) {
    return getBusinessParts(timestampInput).hourNumber;
  },

  getBusinessDateKey(timestampInput = new Date()) {
    return getBusinessParts(timestampInput).dateKey;
  },

  getUtcDateKeysForBusinessDate(dateKey) {
    const start = buildBusinessDateUtcDate(dateKey, 0);
    const end = buildBusinessDateUtcDate(dateKey, 23);
    return Array.from(new Set([
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10)
    ])).sort();
  },

  isUtcMatchOnBusinessDate(rawDateTimeUtc, dateKey) {
    return getBusinessParts(parseUtcDateTime(rawDateTimeUtc)).dateKey === dateKey;
  },

  businessWindowToUtcCronSegments(dateKey, startHour, endHour) {
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 || startHour > endHour) {
      throw new Error(`Invalid business play window: ${startHour}-${endHour}`);
    }

    const segments = [];
    for (let businessHour = startHour; businessHour <= endHour; businessHour++) {
      const utcDate = buildBusinessDateUtcDate(dateKey, businessHour);
      const day = WEEKDAY_CRON_NAMES[utcDate.getUTCDay()];
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
