import { escapeHtml } from '../../../utils/htmlEscape.js';
import { timePolicy } from '../../../utils/timePolicy.js';
import { renderScheduleRow } from '../../components/scheduleRow.js';

export function renderScheduleSection(scheduleMap, globalStats) {
  const dates = Object.keys(scheduleMap).sort();
  if (dates.length === 0) return `<div class="sch-empty">NO FUTURE MATCHES SCHEDULED</div>`;

  let scheduleHtml = `<div class="sch-container">`;
  dates.forEach(scheduleDate => {
    const matches = scheduleMap[scheduleDate];
    const dayName = timePolicy.getWeekdayName(scheduleDate);
    let cardHtml = `<div class="sch-card"><div class="sch-header"><span>📅 <span class="date-display">${scheduleDate.slice(5)}</span> ${dayName}</span><span class="sch-count">${matches.length} Matches</span></div><div class="sch-body">`;
    let lastGroupKey = "";

    matches.forEach(match => {
      const tabName = match.tabName || "";
      const groupKey = `${match.leagueShort}_${tabName}`;
      if (groupKey !== lastGroupKey) {
        const blockHtml = tabName ? `<span class="spine-sep">/</span><span class="spine-r sch-group-block">${escapeHtml(tabName)}</span>` : "";
        cardHtml += `<div class="sch-group-header"><div class="spine-row sch-group-row"><span class="spine-l sch-group-name">${escapeHtml(match.leagueShort)}</span>${blockHtml}</div></div>`;
        lastGroupKey = groupKey;
      }
      cardHtml += renderScheduleRow(match, globalStats);
    });

    cardHtml += `</div></div>`;
    scheduleHtml += cardHtml;
  });
  scheduleHtml += `</div>`;
  return scheduleHtml;
}
