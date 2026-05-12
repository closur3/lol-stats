import { escapeHtml } from '../../../utils/htmlEscape.js';
import { timePolicy } from '../../../utils/timePolicy.js';
import { buildScheduleRow } from '../../components/scheduleRow.js';

const STYLE_SCH_HEADER = 'style="background:#f8fafc;color:#334155"';
const STYLE_SCH_COUNT = 'style="font-size:11px;opacity:0.6"';
const STYLE_SCH_GROUP_HEADER = 'style="background:#f8fafc"';
const STYLE_SCH_GROUP_ROW = 'style="width:100%; padding:0 10px; box-sizing:border-box"';
const STYLE_SCH_GROUP_NAME = 'style="font-weight:700"';
const STYLE_SCH_GROUP_BLOCK = 'style="font-weight:700; opacity:0.7"';

export function renderScheduleSection(scheduleMap, globalStats) {
  const dates = Object.keys(scheduleMap).sort();
  if (dates.length === 0) return `<div class="sch-empty">🕊️ NO FUTURE MATCHES SCHEDULED</div>`;

  let scheduleHtml = `<div class="sch-container">`;
  dates.forEach(scheduleDate => {
    const matches = scheduleMap[scheduleDate];
    const dayName = timePolicy.getWeekdayName(scheduleDate);
    let cardHtml = `<div class="sch-card"><div class="sch-header" ${STYLE_SCH_HEADER}><span>📅 <span class="date-display">${scheduleDate.slice(5)}</span> ${dayName}</span><span ${STYLE_SCH_COUNT}>${matches.length} Matches</span></div><div class="sch-body">`;
    let lastGroupKey = "";

    matches.forEach(match => {
      const tabName = match.tabName || "";
      const groupKey = `${match.league}_${tabName}`;
      if (groupKey !== lastGroupKey) {
        const blockHtml = tabName ? `<span class="spine-sep">/</span><span class="spine-r" ${STYLE_SCH_GROUP_BLOCK}>${escapeHtml(tabName)}</span>` : "";
        cardHtml += `<div class="sch-group-header" ${STYLE_SCH_GROUP_HEADER}><div class="spine-row" ${STYLE_SCH_GROUP_ROW}><span class="spine-l" ${STYLE_SCH_GROUP_NAME}>${escapeHtml(match.league)}</span>${blockHtml}</div></div>`;
        lastGroupKey = groupKey;
      }
      cardHtml += buildScheduleRow(match, globalStats);
    });

    cardHtml += `</div></div>`;
    scheduleHtml += cardHtml;
  });
  scheduleHtml += `</div>`;
  return scheduleHtml;
}
