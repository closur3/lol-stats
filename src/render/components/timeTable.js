import { color } from '../../utils/data/stats.js';
import { timeGridColumnCount } from '../../constants/index.js';
import { escapeHtml } from '../../utils/htmlEscape.js';

const timeTableColumns = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Total"];

function requireTimeCell(timeGrid, hour, dayIndex) {
  const cell = timeGrid[hour]?.[dayIndex];
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

function collectBoxFilters(timeGrid, hours) {
  const bestOfSet = new Set();
  for (const hour of hours) {
    if (!timeGrid[hour]) throw new Error(`timeGrid bucket missing: ${hour}`);
    for (let dayIndex = 0; dayIndex < timeGridColumnCount; dayIndex++) {
      const cell = requireTimeCell(timeGrid, hour, dayIndex);
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
  return `<td class="time-table-cell" data-matches="${matchesJson}" data-day-index="${dayIndex}" data-title="${escapeHtml(label)}" style="background:${color(fullRate, true)};" onclick="showTimeCellPopup(this)"><div class="t-cell"><span class="t-val">${cellData.fullLengthMatchCount}<span class="score-sep">/</span>${cellData.totalMatchCount}</span><span class="t-pct">(${Math.round(fullRate * 100)}%)</span></div></td>`;
}

export function renderTimeTable(timeGrid) {
  if (!timeGrid || typeof timeGrid !== "object" || Array.isArray(timeGrid)) {
    throw new Error("timeGrid must be a JSON object");
  }
  const hours = Object.keys(timeGrid).filter(key => key !== "Total" && !isNaN(key)).map(Number).sort((leftHour, rightHour) => leftHour - rightHour);
  const tableHours = [...hours, "Total"];
  const boxFilters = collectBoxFilters(timeGrid, tableHours);

  let html = `<div class="time-table-block" data-box-filter="all"><table class="time-table"><thead><tr class="time-header-row"><th class="team-col time-filter-cell">${renderBoxFilter(boxFilters)}</th>`;
  timeTableColumns.forEach(dayName => { html += `<th class="time-header-cell">${dayName}</th>`; });
  html += "</tr></thead><tbody>";

  tableHours.forEach(hour => {
    const isTotal = hour === "Total";
    const label = isTotal ? "Total" : `${String(hour).padStart(2,'0')}:00`;
    const rowClass = isTotal ? ' class="time-total-row"' : "";
    const labelClass = isTotal ? "team-col time-total-label" : "team-col";
    html += `<tr${rowClass}><td class="${labelClass}">${label}</td>`;

    for (let dayIndex = 0; dayIndex < timeGridColumnCount; dayIndex++) {
      const cellData = requireTimeCell(timeGrid, hour, dayIndex);
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
