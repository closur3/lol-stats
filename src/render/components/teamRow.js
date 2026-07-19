import { color, pct, rate } from '../../utils/data/stats.js';
import { sortPolicy } from '../../utils/sortPolicy.js';
import { renderSplitScore } from './spine.js';
import { dateUtils } from '../../utils/dateUtils.js';
import { timePolicy } from '../../utils/timePolicy.js';
import { escapeHtml, escapeJsArg } from '../../utils/htmlEscape.js';

export function renderTeamRow(teamStats, slug, sortMeta = {}) {
  validateTurnaroundStats(teamStats);
  const bo3Rate = rate(teamStats.bestOf3FullMatchCount, teamStats.bestOf3TotalMatchCount);
  const bo5Rate = rate(teamStats.bestOf5FullMatchCount, teamStats.bestOf5TotalMatchCount);
  const winRate = rate(teamStats.seriesWinCount, teamStats.seriesTotalMatchCount);
  const gameRate = rate(teamStats.gameWinCount, teamStats.gameTotalCount);
  const bo3BayesTieBreakRate = sortPolicy.getBestOfBayesTieBreakRate(teamStats, 3, sortMeta.bo3PriorMean);
  const bo5BayesTieBreakRate = sortPolicy.getBestOfBayesTieBreakRate(teamStats, 5, sortMeta.bo5PriorMean);
  const bo3Text = teamStats.bestOf3TotalMatchCount ? renderSplitScore(`${teamStats.bestOf3FullMatchCount}/${teamStats.bestOf3TotalMatchCount}`, '/') : "-";
  const bo5Text = teamStats.bestOf5TotalMatchCount ? renderSplitScore(`${teamStats.bestOf5FullMatchCount}/${teamStats.bestOf5TotalMatchCount}`, '/') : "-";
  const seriesText = teamStats.seriesTotalMatchCount ? renderSplitScore(`${teamStats.seriesWinCount}-${teamStats.seriesTotalMatchCount - teamStats.seriesWinCount}`, '-') : "-";
  const gameText = teamStats.gameTotalCount ? renderSplitScore(`${teamStats.gameWinCount}-${teamStats.gameTotalCount - teamStats.gameWinCount}`, '-') : "-";
  const streak = teamStats.winStreakCount > 0
    ? `<span class="badge badge-win">${teamStats.winStreakCount}W</span>`
    : (teamStats.lossStreakCount > 0 ? `<span class="badge badge-loss">${teamStats.lossStreakCount}L</span>` : "-");
  const lastMatch = teamStats.last ? timePolicy.formatMonthDayTime(teamStats.last) : "-";
  const lastMatchColor = dateUtils.colorDate(teamStats.last);

  const slugArgument = escapeJsArg(slug);
  const teamNameArgument = escapeJsArg(teamStats.name);
  const safeDisplayName = escapeHtml(teamStats.name);

  const getClass = (baseClass, count) => count > 0 ? `${baseClass} team-clickable` : baseClass;
  const getClickHandler = (type, count) => count > 0 ? `onclick="openStats(${slugArgument}, ${teamNameArgument}, ${escapeJsArg(type)})"` : "";
  const gameHistoryCount = teamStats.history.filter(match => Array.isArray(match.gameResults)).length;
  const comebackText = renderTurnaroundCells(
    teamStats.comebackCount,
    teamStats.seriesTrailedCount,
    "col-series-trailed",
    "col-series-trailed-pct",
    sortMeta.comebackPriorMean,
    getClickHandler('seriesTrailed', teamStats.seriesTrailedCount)
  );
  const lostLeadText = renderTurnaroundCells(
    teamStats.lostLeadCount,
    teamStats.seriesLedCount,
    "col-series-led",
    "col-series-led-pct",
    sortMeta.lostLeadPriorMean,
    getClickHandler('seriesLed', teamStats.seriesLedCount)
  );
  const emptyClass = (count) => count === 0 ? " is-empty-stat" : "";
  const percentStyle = (value, strong = false) => `style="background:${color(value, strong)};color:${value !== null ? 'white' : '#cbd5e1'}"`;
  const lastClass = teamStats.last ? "col-last" : "col-last is-empty-stat";
  const lastStyle = teamStats.last ? `style="color:${lastMatchColor}"` : "";
  const streakEmpty = teamStats.winStreakCount === 0 && teamStats.lossStreakCount === 0;
  const streakClass = streakEmpty ? "col-streak is-empty-stat" : "col-streak";
  return `<tr><td class="team-col team-clickable" onclick="openTeam(${teamNameArgument})">${safeDisplayName}</td>` +
    `<td class="${getClass('col-bo3', teamStats.bestOf3TotalMatchCount)} metric-record${emptyClass(teamStats.bestOf3TotalMatchCount)}" ${getClickHandler('bo3', teamStats.bestOf3TotalMatchCount)}>${bo3Text}</td>` +
    `<td class="col-bo3-pct metric-rate rate-cell" data-bayes-tie="${bo3BayesTieBreakRate}" data-sample-size="${teamStats.bestOf3TotalMatchCount || 0}" ${percentStyle(bo3Rate, true)}>${pct(bo3Rate)}</td>` +
    `<td class="${getClass('col-bo5', teamStats.bestOf5TotalMatchCount)} metric-record${emptyClass(teamStats.bestOf5TotalMatchCount)}" ${getClickHandler('bo5', teamStats.bestOf5TotalMatchCount)}>${bo5Text}</td>` +
    `<td class="col-bo5-pct metric-rate rate-cell" data-bayes-tie="${bo5BayesTieBreakRate}" data-sample-size="${teamStats.bestOf5TotalMatchCount || 0}" ${percentStyle(bo5Rate, true)}>${pct(bo5Rate)}</td>` +
    `<td class="${getClass('col-series', teamStats.seriesTotalMatchCount)} metric-record${emptyClass(teamStats.seriesTotalMatchCount)}" ${getClickHandler('series', teamStats.seriesTotalMatchCount)}>${seriesText}</td>` +
    `<td class="col-series-wr metric-rate rate-cell" ${percentStyle(winRate)}>${pct(winRate)}</td>` +
    `<td class="${getClass('col-game', gameHistoryCount)} metric-record${emptyClass(teamStats.gameTotalCount)}" ${getClickHandler('games', gameHistoryCount)}>${gameText}</td>` +
    `<td class="col-game-wr metric-rate rate-cell" ${percentStyle(gameRate)}>${pct(gameRate)}</td>` +
    comebackText +
    lostLeadText +
    `<td class="${streakClass}">${streak}</td>` +
    `<td class="${lastClass}" ${lastStyle}>${lastMatch}</td></tr>`;
}

function renderTurnaroundCells(count, opportunityCount, recordClassName, rateClassName, priorMean, clickHandler) {
  if (opportunityCount === 0) {
    return `<td class="${recordClassName} metric-record is-empty-stat">-</td>` +
      `<td class="${rateClassName} metric-rate rate-cell is-empty-stat" data-rate="" data-bayes-sort="" data-sample-size="0">-</td>`;
  }
  const turnaroundRate = rate(count, opportunityCount);
  const bayesSortRate = sortPolicy.bayesPosteriorRate(count, opportunityCount, priorMean, sortPolicy.bayesPriorStrength);
  const cellStyle = `style="background:${color(turnaroundRate, true)};color:white"`;
  const record = renderSplitScore(`${count}/${opportunityCount}`, '/');
  return `<td class="${recordClassName} metric-record team-clickable" ${clickHandler}>${record}</td>` +
    `<td class="${rateClassName} metric-rate rate-cell" data-rate="${turnaroundRate}" data-bayes-sort="${bayesSortRate}" data-sample-size="${opportunityCount}" ${cellStyle}>${pct(turnaroundRate)}</td>`;
}

function validateTurnaroundStats(teamStats) {
  const fields = [
    "seriesTrailedCount",
    "comebackCount",
    "seriesLedCount",
    "lostLeadCount",
    "reverseSweepCount",
    "reverseSweptCount"
  ];
  for (const field of fields) {
    if (!Number.isInteger(teamStats[field]) || teamStats[field] < 0) {
      throw new Error(`Invalid team turnaround field: ${teamStats.name}.${field}`);
    }
  }
  if (teamStats.comebackCount > teamStats.seriesTrailedCount || teamStats.lostLeadCount > teamStats.seriesLedCount) {
    throw new Error(`Invalid team turnaround totals: ${teamStats.name}`);
  }
  if (teamStats.reverseSweepCount > teamStats.comebackCount || teamStats.reverseSweptCount > teamStats.lostLeadCount) {
    throw new Error(`Invalid team reverse sweep totals: ${teamStats.name}`);
  }
}
