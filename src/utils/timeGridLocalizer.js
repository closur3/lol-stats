import { TIME_GRID_COLUMN_COUNT } from '../constants/index.js';

function createSlot() {
  const slot = {};
  for (let dayIndex = 0; dayIndex < TIME_GRID_COLUMN_COUNT; dayIndex++) {
    slot[dayIndex] = { totalMatchCount: 0, fullLengthMatchCount: 0, matches: [] };
  }
  slot[7] = { totalMatchCount: 0, fullLengthMatchCount: 0, matches: [] };
  return slot;
}

function getLocalParts(isoTimestamp, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(new Date(isoTimestamp)).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  if (!parts.year || !parts.month || !parts.day || !parts.hour) {
    throw new Error(`Cannot localize timestamp: ${isoTimestamp}`);
  }
  const utcDay = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))).getUTCDay();
  const weekdayIndex = utcDay === 0 ? 6 : utcDay - 1;
  return { hour: Number(parts.hour) % 24, weekdayIndex };
}

function addMatch(grid, label, weekdayIndex, match) {
  if (!grid[label]) grid[label] = createSlot();
  if (!grid.Total) grid.Total = createSlot();

  const addToCell = (cell) => {
    cell.totalMatchCount++;
    if (match.isFullLength) cell.fullLengthMatchCount++;
    cell.matches.push(match);
  };

  addToCell(grid[label][weekdayIndex]);
  addToCell(grid[label][7]);
  addToCell(grid.Total[weekdayIndex]);
  addToCell(grid.Total[7]);
}

function localizeClusterLabel(utcHourLabel, isoTimestamp, timeZone) {
  const sourceDate = new Date(isoTimestamp);
  const utcHour = Number(utcHourLabel);
  if (!Number.isInteger(utcHour) || utcHour < 0 || utcHour > 23) {
    throw new Error(`Invalid timeGrid hour label: ${utcHourLabel}`);
  }
  const clusterDate = new Date(Date.UTC(
    sourceDate.getUTCFullYear(),
    sourceDate.getUTCMonth(),
    sourceDate.getUTCDate(),
    utcHour
  ));
  return String(getLocalParts(clusterDate.toISOString(), timeZone).hour);
}

export function localizeTimeGrid(regionGrid, timeZone) {
  if (!regionGrid || typeof regionGrid !== "object" || Array.isArray(regionGrid)) {
    throw new Error("timeGrid must be object");
  }
  const localized = { Total: createSlot() };
  const clusterLabels = Object.keys(regionGrid).filter(label => label !== "Total" && !Number.isNaN(Number(label)));
  for (const clusterLabel of clusterLabels) {
    for (let weekdayIndex = 0; weekdayIndex < TIME_GRID_COLUMN_COUNT - 1; weekdayIndex++) {
      const matches = regionGrid[clusterLabel]?.[weekdayIndex]?.matches || [];
      for (const match of matches) {
        if (!match?.isoTimestamp) throw new Error("timeGrid match missing isoTimestamp");
        const localParts = getLocalParts(match.isoTimestamp, timeZone);
        const localClusterLabel = localizeClusterLabel(clusterLabel, match.isoTimestamp, timeZone);
        addMatch(localized, localClusterLabel, localParts.weekdayIndex, match);
      }
    }
  }
  return localized;
}
