import { color } from '../../utils/data/stats.js';
import { timeGridColumnCount } from '../../constants/index.js';
import { escapeHtml } from '../../utils/htmlEscape.js';
import { describeSchemaValue, throwSchemaIssue } from '../../core/facts/schemaIssue.js';
import { getOverviewPageLabel } from '../../utils/data/overviewPages.js';

const timeTableColumns = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Total"];

function requireTimeCell(timeGrid, artifactKey, timeGridPath, hour, dayIndex) {
  const cellPath = `${timeGridPath}.${hour}.${dayIndex}`;
  const cell = timeGrid[hour]?.[dayIndex];
  if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
    throwSchemaIssue({ artifactKey, path: cellPath, kind: cell == null ? "missing" : "invalid", expected: "time-grid cell object", ...(cell == null ? {} : { actual: describeSchemaValue(cell) }) });
  }
  if (!Array.isArray(cell.matches)) {
    throwSchemaIssue({ artifactKey, path: `${cellPath}.matches`, kind: cell.matches == null ? "missing" : "invalid", expected: "array", ...(cell.matches == null ? {} : { actual: describeSchemaValue(cell.matches) }) });
  }
  return cell;
}

function validateTimeCell(cell, artifactKey, timeGridPath, hour, dayIndex) {
  for (const [matchIndex, match] of cell.matches.entries()) {
    const matchPath = `${timeGridPath}.${hour}.${dayIndex}.matches[${matchIndex}]`;
    if (!Array.isArray(match.gameResults) || match.gameResults.length === 0) {
      const value = match.gameResults;
      throwSchemaIssue({ artifactKey, path: `${matchPath}.gameResults`, kind: value == null ? "missing" : "invalid", expected: "non-empty W/L array", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
    }
    if (match.gameResults.some(result => result !== "W" && result !== "L")) {
      const actual = `values(${match.gameResults.map(String).join(",").slice(0, 64)})`;
      throwSchemaIssue({ artifactKey, path: `${matchPath}.gameResults`, kind: "invalid", expected: "array containing only W or L", actual });
    }
    const scoreMatch = String(match.scoreDisplay).match(/^(\d+)-(\d+)$/);
    if (!scoreMatch) throwSchemaIssue({ artifactKey, path: `${matchPath}.scoreDisplay`, kind: match.scoreDisplay == null ? "missing" : "invalid", expected: "score in X-X format", ...(match.scoreDisplay == null ? {} : { actual: describeSchemaValue(match.scoreDisplay) }) });
    const team1Score = Number(scoreMatch[1]);
    const team2Score = Number(scoreMatch[2]);
    const winCount = match.gameResults.filter(result => result === "W").length;
    const lossCount = match.gameResults.filter(result => result === "L").length;
    if (winCount !== team1Score || lossCount !== team2Score) {
      throwSchemaIssue({ artifactKey, path: `${matchPath}.gameResults`, kind: "mismatch", expected: `W=${team1Score}, L=${team2Score} from scoreDisplay`, actual: `W=${winCount}, L=${lossCount}` });
    }
    if (match.turnaroundType != null && match.turnaroundType !== "leadChange" && match.turnaroundType !== "reverseSweep") {
      throwSchemaIssue({ artifactKey, path: `${matchPath}.turnaroundType`, kind: "invalid", expected: "leadChange or reverseSweep", actual: describeSchemaValue(match.turnaroundType) });
    }
  }
  const totalMatchCount = cell.matches.length;
  const fullLengthMatchCount = cell.matches.filter(match => match.isFullLength).length;
  if (cell.totalMatchCount !== totalMatchCount) {
    throwSchemaIssue({ artifactKey, path: `${timeGridPath}.${hour}.${dayIndex}.totalMatchCount`, kind: "mismatch", expected: String(totalMatchCount), actual: describeSchemaValue(cell.totalMatchCount) });
  }
  if (cell.fullLengthMatchCount !== fullLengthMatchCount) {
    throwSchemaIssue({ artifactKey, path: `${timeGridPath}.${hour}.${dayIndex}.fullLengthMatchCount`, kind: "mismatch", expected: String(fullLengthMatchCount), actual: describeSchemaValue(cell.fullLengthMatchCount) });
  }
}

function collectTimeFilters(timeGrid, artifactKey, timeGridPath, hours) {
  const bestOfSet = new Set();
  const tabs = new Map();
  for (const hour of hours) {
    if (!timeGrid[hour]) throwSchemaIssue({ artifactKey, path: `${timeGridPath}.${hour}`, kind: "missing", expected: "time-grid bucket object" });
    for (let dayIndex = 0; dayIndex < timeGridColumnCount; dayIndex++) {
      const cell = requireTimeCell(timeGrid, artifactKey, timeGridPath, hour, dayIndex);
      validateTimeCell(cell, artifactKey, timeGridPath, hour, dayIndex);
      for (const [matchIndex, match] of cell.matches.entries()) {
        if (!Number.isInteger(match.bestOf) || match.bestOf <= 0) {
          const value = match.bestOf;
          throwSchemaIssue({ artifactKey, path: `${timeGridPath}.${hour}.${dayIndex}.matches[${matchIndex}].bestOf`, kind: value == null ? "missing" : "invalid", expected: "positive integer", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
        }
        if (typeof match.overviewPage !== "string" || !match.overviewPage.trim()) {
          const value = match.overviewPage;
          throwSchemaIssue({ artifactKey, path: `${timeGridPath}.${hour}.${dayIndex}.matches[${matchIndex}].overviewPage`, kind: value == null ? "missing" : "invalid", expected: "non-empty string", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
        }
        if (typeof match.tabName !== "string" || !match.tabName.trim()) {
          const value = match.tabName;
          throwSchemaIssue({ artifactKey, path: `${timeGridPath}.${hour}.${dayIndex}.matches[${matchIndex}].tabName`, kind: value == null ? "missing" : "invalid", expected: "non-empty string", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
        }
        if (!Number.isFinite(match.timestamp)) {
          const value = match.timestamp;
          throwSchemaIssue({ artifactKey, path: `${timeGridPath}.${hour}.${dayIndex}.matches[${matchIndex}].timestamp`, kind: value == null ? "missing" : "invalid", expected: "finite number", ...(value == null ? {} : { actual: describeSchemaValue(value) }) });
        }
        bestOfSet.add(match.bestOf);
        const tabKey = JSON.stringify([match.overviewPage, match.tabName]);
        const currentTab = tabs.get(tabKey);
        if (!currentTab || match.timestamp < currentTab.timestamp) {
          tabs.set(tabKey, { overviewPage: match.overviewPage, tabName: match.tabName, timestamp: match.timestamp });
        }
      }
    }
  }
  const tabGroups = new Map();
  for (const [tabKey, tab] of tabs) {
    if (!tabGroups.has(tab.overviewPage)) tabGroups.set(tab.overviewPage, []);
    tabGroups.get(tab.overviewPage).push({ value: `tab:${tabKey}`, label: tab.tabName, timestamp: tab.timestamp });
  }
  const hasMultipleOverviewPages = tabGroups.size > 1;
  return {
    bestOf: Array.from(bestOfSet)
      .sort((leftBestOf, rightBestOf) => leftBestOf - rightBestOf)
      .map(bestOf => ({ value: `bestOf:${bestOf}`, label: `BO${bestOf}` })),
    tabGroups: Array.from(tabGroups.entries())
      .map(([overviewPage, tabFilters]) => ({
        label: hasMultipleOverviewPages ? getOverviewPageLabel(overviewPage) : "TAB",
        timestamp: Math.min(...tabFilters.map(tabFilter => tabFilter.timestamp)),
        filters: tabFilters
          .sort((leftTab, rightTab) => rightTab.timestamp - leftTab.timestamp || rightTab.label.localeCompare(leftTab.label))
          .map(({ value, label }) => ({ value, label }))
      }))
      .sort((leftGroup, rightGroup) => rightGroup.timestamp - leftGroup.timestamp || rightGroup.label.localeCompare(leftGroup.label))
  };
}

function renderFilterGroup(label, filters) {
  if (filters.length === 0) return "";
  const options = filters.map(filter => `<button type="button" class="compact-menu-option" role="option" aria-selected="false" data-time-filter-value="${escapeHtml(filter.value)}" data-time-filter-label="${escapeHtml(filter.label)}" onclick="applyTimeFilter(this)">${escapeHtml(filter.label)}</button>`).join("");
  return `<div class="compact-menu-group"><div class="compact-menu-group-label">${escapeHtml(label)}</div>${options}</div>`;
}

function renderTimeFilter(filters) {
  const tabGroups = filters.tabGroups.map(group => renderFilterGroup(group.label, group.filters)).join("");
  return `<div class="time-filter compact-menu"><button type="button" class="time-filter-trigger compact-menu-trigger" aria-label="Filter time distribution" aria-expanded="false" onclick="toggleCompactMenu(this)"><span class="compact-menu-value">ALL</span></button><div class="time-filter-menu compact-menu-popup" role="listbox" aria-hidden="true"><button type="button" class="compact-menu-option is-selected" role="option" aria-selected="true" data-time-filter-value="all" data-time-filter-label="ALL" onclick="applyTimeFilter(this)">ALL</button>${renderFilterGroup("BEST OF", filters.bestOf)}${tabGroups}</div></div>`;
}

function renderEmptyCell(matchesJson) {
  return `<td class="time-table-cell is-empty" data-matches="${matchesJson}" data-day-index="" data-title=""><span class="time-empty">-</span></td>`;
}

function renderValueCell(label, dayIndex, cellData) {
  const fullRate = cellData.fullLengthMatchCount / cellData.totalMatchCount;
  const matchesJson = escapeHtml(JSON.stringify(cellData.matches));
  return `<td class="time-table-cell" data-matches="${matchesJson}" data-day-index="${dayIndex}" data-title="${escapeHtml(label)}" style="background:${color(fullRate, true)};" onclick="showTimeCellPopup(this)"><div class="t-cell"><span class="t-val">${cellData.fullLengthMatchCount}<span class="score-sep">/</span>${cellData.totalMatchCount}</span><span class="t-pct">(${Math.round(fullRate * 100)}%)</span></div></td>`;
}

export function validateTimeGrid(timeGrid, artifactKey) {
  if (typeof artifactKey !== "string" || !artifactKey) throw new Error("timeTable artifactKey missing");
  if (!timeGrid || typeof timeGrid !== "object" || Array.isArray(timeGrid)) {
    throwSchemaIssue({ artifactKey, path: "timeGrid", kind: timeGrid == null ? "missing" : "invalid", expected: "JSON object", ...(timeGrid == null ? {} : { actual: describeSchemaValue(timeGrid) }) });
  }
  const timeGridPath = "timeGrid";
  const hours = Object.keys(timeGrid).filter(key => key !== "Total" && !isNaN(key)).map(Number).sort((leftHour, rightHour) => leftHour - rightHour);
  const tableHours = [...hours, "Total"];
  const timeFilters = collectTimeFilters(timeGrid, artifactKey, timeGridPath, tableHours);
  return { tableHours, timeFilters, timeGridPath };
}

export function renderTimeTable(timeGrid, artifactKey) {
  const { tableHours, timeFilters, timeGridPath } = validateTimeGrid(timeGrid, artifactKey);

  let html = `<div class="time-table-block" data-time-filter="all"><table class="time-table"><colgroup><col><col span="7"><col style="width:180px"></colgroup><thead><tr class="time-header-row"><th class="team-col time-filter-cell">${renderTimeFilter(timeFilters)}</th>`;
  timeTableColumns.forEach(dayName => { html += `<th class="time-header-cell">${dayName}</th>`; });
  html += "</tr></thead><tbody>";

  tableHours.forEach(hour => {
    const isTotal = hour === "Total";
    const label = isTotal ? "Total" : `${String(hour).padStart(2,'0')}:00`;
    const rowClass = isTotal ? ' class="time-total-row"' : "";
    const labelClass = isTotal ? "team-col time-total-label" : "team-col";
    html += `<tr${rowClass}><td class="${labelClass}">${label}</td>`;

    for (let dayIndex = 0; dayIndex < timeGridColumnCount; dayIndex++) {
      const cellData = requireTimeCell(timeGrid, artifactKey, timeGridPath, hour, dayIndex);
      validateTimeCell(cellData, artifactKey, timeGridPath, hour, dayIndex);
      if (cellData.totalMatchCount === 0) {
        html += renderEmptyCell(escapeHtml(JSON.stringify(cellData.matches)));
      } else {
        html += renderValueCell(label, dayIndex, cellData);
      }
    }

    html += "</tr>";
  });

  html += "</tbody></table></div>";
  return html;
}
