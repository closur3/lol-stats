import { color } from '../../utils/data/stats.js';
import { timeGridColumnCount } from '../../constants/index.js';
import { escapeHtml } from '../../utils/htmlEscape.js';
import { throwSchemaIssue } from '../../core/facts/schemaIssue.js';
import { getOverviewPageLabel } from '../../utils/data/overviewPages.js';
import { readTimeDistributionIssue } from '../../core/facts/timeDistribution.js';

const timeTableColumns = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Total"];
function buildCells(matches) {
  const hours = [...new Set(matches.map(match => Number(match.timeSlot)))].sort((left, right) => left - right);
  const tableHours = [...hours, "Total"];
  const cells = Object.fromEntries(tableHours.map(hour => [hour, Array.from({ length: timeGridColumnCount }, () => [])]));
  for (const match of matches) {
    const hour = Number(match.timeSlot);
    cells[hour][match.weekdayIndex].push(match);
    cells[hour][7].push(match);
    cells.Total[match.weekdayIndex].push(match);
    cells.Total[7].push(match);
  }
  return { tableHours, cells };
}

function collectTimeFilters(matches) {
  const bestOfSet = new Set();
  const tabs = new Map();
  for (const match of matches) {
    bestOfSet.add(match.bestOf);
    const tabKey = JSON.stringify([match.overviewPage, match.tabName]);
    const currentTab = tabs.get(tabKey);
    if (!currentTab || match.timestamp < currentTab.timestamp) {
      tabs.set(tabKey, { overviewPage: match.overviewPage, tabName: match.tabName, timestamp: match.timestamp });
    }
  }
  const tabGroups = new Map();
  for (const [tabKey, tab] of tabs) {
    if (!tabGroups.has(tab.overviewPage)) tabGroups.set(tab.overviewPage, []);
    tabGroups.get(tab.overviewPage).push({ value: `tab:${tabKey}`, label: tab.tabName, timestamp: tab.timestamp });
  }
  const hasMultipleOverviewPages = tabGroups.size > 1;
  return {
    bestOf: [...bestOfSet].sort((left, right) => left - right).map(bestOf => ({ value: `bestOf:${bestOf}`, label: `BO${bestOf}` })),
    tabGroups: [...tabGroups.entries()]
      .map(([overviewPage, tabFilters]) => ({
        label: hasMultipleOverviewPages ? getOverviewPageLabel(overviewPage) : "TAB",
        timestamp: Math.min(...tabFilters.map(tabFilter => tabFilter.timestamp)),
        filters: tabFilters
          .sort((left, right) => right.timestamp - left.timestamp || right.label.localeCompare(left.label))
          .map(({ value, label }) => ({ value, label }))
      }))
      .sort((left, right) => right.timestamp - left.timestamp || right.label.localeCompare(left.label))
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

function renderCell(label, dayIndex, matches) {
  const matchesJson = escapeHtml(JSON.stringify(matches));
  if (matches.length === 0) {
    return `<td class="time-table-cell is-empty" data-matches="${matchesJson}" data-day-index="" data-title=""><span class="time-empty">-</span></td>`;
  }
  const fullLengthMatchCount = matches.filter(match => match.isFullLength).length;
  const fullRate = fullLengthMatchCount / matches.length;
  return `<td class="time-table-cell" data-matches="${matchesJson}" data-day-index="${dayIndex}" data-title="${escapeHtml(label)}" style="background:${color(fullRate, true)};" onclick="showTimeCellPopup(this)"><div class="t-cell"><span class="t-val">${fullLengthMatchCount}<span class="score-sep">/</span>${matches.length}</span><span class="t-pct">(${Math.round(fullRate * 100)}%)</span></div></td>`;
}

export function validateTimeGrid(matches, artifactKey) {
  if (typeof artifactKey !== "string" || !artifactKey) throw new Error("timeTable artifactKey missing");
  const schemaIssue = readTimeDistributionIssue(matches, artifactKey);
  if (schemaIssue) throwSchemaIssue(schemaIssue);
  return { ...buildCells(matches), timeFilters: collectTimeFilters(matches) };
}

export function renderTimeTable(matches, artifactKey) {
  const { tableHours, cells, timeFilters } = validateTimeGrid(matches, artifactKey);
  let html = `<div class="time-table-block" data-time-filter="all"><table class="time-table"><colgroup><col><col span="7"><col style="width:180px"></colgroup><thead><tr class="time-header-row"><th class="team-col time-filter-cell">${renderTimeFilter(timeFilters)}</th>`;
  timeTableColumns.forEach(dayName => { html += `<th class="time-header-cell">${dayName}</th>`; });
  html += "</tr></thead><tbody>";

  tableHours.forEach(hour => {
    const isTotal = hour === "Total";
    const label = isTotal ? "Total" : `${String(hour).padStart(2, '0')}:00`;
    html += `<tr${isTotal ? ' class="time-total-row"' : ""}><td class="${isTotal ? "team-col time-total-label" : "team-col"}">${label}</td>`;
    for (let dayIndex = 0; dayIndex < timeGridColumnCount; dayIndex++) html += renderCell(label, dayIndex, cells[hour][dayIndex]);
    html += "</tr>";
  });

  return `${html}</tbody></table></div>`;
}
