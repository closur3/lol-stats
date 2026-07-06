import { color } from '../../utils/data/stats.js';
import { TIME_GRID_COLUMN_COUNT } from '../../constants/index.js';
import { escapeHtml } from '../../utils/htmlEscape.js';

const STYLE_SCORE_SEP = 'style="opacity:0.4; margin:0 1px;"';

const TIME_TABLE_COLUMNS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Total"];

function requireTimeCell(regionGrid, hour, dayIndex) {
  const cell = regionGrid[hour]?.[dayIndex];
  if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
    throw new Error(`timeGrid cell missing: ${hour}.${dayIndex}`);
  }
  if (!Array.isArray(cell.matches)) {
    throw new Error(`timeGrid cell matches missing: ${hour}.${dayIndex}`);
  }
  return cell;
}

function validateTimeCell(cell, hour, dayIndex) {
  const totalMatchCount = cell.matches.length;
  const fullLengthMatchCount = cell.matches.filter(match => match.isFullLength).length;
  if (cell.totalMatchCount !== totalMatchCount) {
    throw new Error(`timeGrid totalMatchCount mismatch: ${hour}.${dayIndex}`);
  }
  if (cell.fullLengthMatchCount !== fullLengthMatchCount) {
    throw new Error(`timeGrid fullLengthMatchCount mismatch: ${hour}.${dayIndex}`);
  }
}

function collectBoxFilters(regionGrid, hours) {
  const bestOfSet = new Set();
  for (const hour of hours) {
    if (!regionGrid[hour]) throw new Error(`timeGrid bucket missing: ${hour}`);
    for (let dayIndex = 0; dayIndex < TIME_GRID_COLUMN_COUNT; dayIndex++) {
      const cell = requireTimeCell(regionGrid, hour, dayIndex);
      validateTimeCell(cell, hour, dayIndex);
      for (const match of cell.matches) {
        if (!Number.isInteger(match.bestOf) || match.bestOf <= 0) {
          throw new Error(`timeGrid match bestOf invalid: ${hour}.${dayIndex}`);
        }
        bestOfSet.add(match.bestOf);
      }
    }
  }
  return [
    { value: "all", label: "ALL", displayLabel: "ALL" },
    ...Array.from(bestOfSet)
      .sort((leftBestOf, rightBestOf) => leftBestOf - rightBestOf)
      .map(bestOf => ({ value: String(bestOf), label: `BO${bestOf}`, displayLabel: String(bestOf) }))
  ];
}

function renderBoxFilter(filters) {
  const options = filters.map(filter => {
    const selectedAttr = filter.value === "all" ? " selected" : "";
    return `<option value="${escapeHtml(filter.value)}"${selectedAttr}>${escapeHtml(filter.label)}</option>`;
  }).join("");
  return `<select class="time-box-select" aria-label="Filter by best of" onchange="applyTimeBoxFilter(this)">${options}</select>`;
}

function renderEmptyCell(matchesJson) {
  return `<td class="time-table-cell is-empty" data-matches="${matchesJson}" data-day-index="" data-title=""><span class="time-empty">-</span></td>`;
}

function renderValueCell(label, dayIndex, cellData) {
  const fullRate = cellData.fullLengthMatchCount / cellData.totalMatchCount;
  const matchesJson = escapeHtml(JSON.stringify(cellData.matches));
  return `<td class="time-table-cell" data-matches="${matchesJson}" data-day-index="${dayIndex}" data-title="${escapeHtml(label)}" style="background:${color(fullRate, true)};" onclick="showTimeCellPopup(this)"><div class="t-cell"><span class="t-val">${cellData.fullLengthMatchCount}<span ${STYLE_SCORE_SEP}>/</span>${cellData.totalMatchCount}</span><span class="t-pct">(${Math.round(fullRate * 100)}%)</span></div></td>`;
}

export function buildTimeTable(regionGrid) {
  if (!regionGrid || typeof regionGrid !== "object" || Array.isArray(regionGrid)) {
    throw new Error("regionGrid must be a JSON object");
  }
  const hours = Object.keys(regionGrid).filter(key => key !== "Total" && !isNaN(key)).map(Number).sort((leftHour, rightHour) => leftHour - rightHour);
  const tableHours = [...hours, "Total"];
  const boxFilters = collectBoxFilters(regionGrid, tableHours);

  let html = `<div class="time-table-block" data-box-filter="all"><table style="font-variant-numeric:tabular-nums; border-top:none;"><thead><tr style="border-bottom:none;"><th class="team-col time-filter-cell" style="cursor:default;">${renderBoxFilter(boxFilters)}</th>`;
  TIME_TABLE_COLUMNS.forEach(dayName => { html += `<th style="cursor:default; pointer-events:none;">${dayName}</th>`; });
  html += "</tr></thead><tbody>";

  tableHours.forEach(hour => {
    const isTotal = hour === "Total";
    const label = isTotal ? "Total" : `${String(hour).padStart(2,'0')}:00`;
    html += `<tr style="${isTotal ? 'font-weight:bold; background:#f8fafc;' : ''}"><td class="team-col" style="${isTotal ? 'background:#f1f5f9;' : ''}">${label}</td>`;

    for (let dayIndex = 0; dayIndex < TIME_GRID_COLUMN_COUNT; dayIndex++) {
      const cellData = requireTimeCell(regionGrid, hour, dayIndex);
      validateTimeCell(cellData, hour, dayIndex);
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
