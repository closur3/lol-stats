import { color, pct, rate } from '../../utils/data/stats.js';
import { sortPolicy } from '../../utils/sortPolicy.js';
import { mkSpine } from './spine.js';
import { dateUtils } from '../../utils/dateUtils.js';
import { timePolicy } from '../../utils/timePolicy.js';

const escapeHtml = (str) => {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
};

const escapeJsString = (str) => {
  if (!str) return "";
  return escapeHtml(str).replace(/\//g, "&#x2F;");
};

export function buildTeamRow(teamStats, slug, sortMeta = {}) {
  const bo3Rate = rate(teamStats.bestOf3FullMatchCount, teamStats.bestOf3TotalMatchCount);
  const bo5Rate = rate(teamStats.bestOf5FullMatchCount, teamStats.bestOf5TotalMatchCount);
  const winRate = rate(teamStats.seriesWinCount, teamStats.seriesTotalMatchCount);
  const gameRate = rate(teamStats.gameWinCount, teamStats.gameTotalCount);
  const bo3BayesTieBreakRate = sortPolicy.getBestOfBayesTieBreakRate(teamStats, 3, sortMeta.bo3PriorMean);
  const bo5BayesTieBreakRate = sortPolicy.getBestOfBayesTieBreakRate(teamStats, 5, sortMeta.bo5PriorMean);
  const bo3Text = teamStats.bestOf3TotalMatchCount ? mkSpine(`${teamStats.bestOf3FullMatchCount}/${teamStats.bestOf3TotalMatchCount}`, '/') : "-";
  const bo5Text = teamStats.bestOf5TotalMatchCount ? mkSpine(`${teamStats.bestOf5FullMatchCount}/${teamStats.bestOf5TotalMatchCount}`, '/') : "-";
  const seriesText = teamStats.seriesTotalMatchCount ? mkSpine(`${teamStats.seriesWinCount}-${teamStats.seriesTotalMatchCount - teamStats.seriesWinCount}`, '-') : "-";
  const gameText = teamStats.gameTotalCount ? mkSpine(`${teamStats.gameWinCount}-${teamStats.gameTotalCount - teamStats.gameWinCount}`, '-') : "-";
  const streak = teamStats.winStreakCount > 0
    ? `<span class="badge badge-win">${teamStats.winStreakCount}W</span>`
    : (teamStats.lossStreakCount > 0 ? `<span class="badge badge-loss">${teamStats.lossStreakCount}L</span>` : "-");
  const lastMatch = teamStats.last ? timePolicy.formatDateTime(teamStats.last) : "-";
  const lastMatchColor = dateUtils.colorDate(teamStats.last);

  const safeName = escapeJsString(teamStats.name);
  const safeDisplayName = escapeHtml(teamStats.name);

  const getClass = (baseClass, count) => count > 0 ? `${baseClass} team-clickable` : baseClass;
  const getClickHandler = (name, type, count) => count > 0 ? `onclick="openStats('${slug}', '${name}', '${type}')"` : "";
  const emptyClass = (count) => count === 0 ? " is-empty-stat" : "";
  const percentStyle = (value, strong = false) => `style="background:${color(value, strong)};color:${value !== null ? 'white' : '#cbd5e1'}"`;
  const lastClass = teamStats.last ? "col-last" : "col-last is-empty-stat";
  const lastStyle = teamStats.last ? `style="color:${lastMatchColor}"` : "";
  const streakEmpty = teamStats.winStreakCount === 0 && teamStats.lossStreakCount === 0;
  const streakClass = streakEmpty ? "col-streak is-empty-stat" : "col-streak";

  return `<tr><td class="team-col team-clickable" onclick="openTeam('${slug}', '${safeName}')">${safeDisplayName}</td>` +
    `<td class="${getClass('col-bo3', teamStats.bestOf3TotalMatchCount)}${emptyClass(teamStats.bestOf3TotalMatchCount)}" ${getClickHandler(safeName, 'bo3', teamStats.bestOf3TotalMatchCount)}>${bo3Text}</td>` +
    `<td class="col-bo3-pct rate-cell" data-bayes-tie="${bo3BayesTieBreakRate}" data-sample-size="${teamStats.bestOf3TotalMatchCount || 0}" ${percentStyle(bo3Rate, true)}>${pct(bo3Rate)}</td>` +
    `<td class="${getClass('col-bo5', teamStats.bestOf5TotalMatchCount)}${emptyClass(teamStats.bestOf5TotalMatchCount)}" ${getClickHandler(safeName, 'bo5', teamStats.bestOf5TotalMatchCount)}>${bo5Text}</td>` +
    `<td class="col-bo5-pct rate-cell" data-bayes-tie="${bo5BayesTieBreakRate}" data-sample-size="${teamStats.bestOf5TotalMatchCount || 0}" ${percentStyle(bo5Rate, true)}>${pct(bo5Rate)}</td>` +
    `<td class="${getClass('col-series', teamStats.seriesTotalMatchCount)}${emptyClass(teamStats.seriesTotalMatchCount)}" ${getClickHandler(safeName, 'series', teamStats.seriesTotalMatchCount)}>${seriesText}</td>` +
    `<td class="col-series-wr rate-cell" ${percentStyle(winRate)}>${pct(winRate)}</td>` +
    `<td class="col-game${emptyClass(teamStats.gameTotalCount)}">${gameText}</td>` +
    `<td class="col-game-wr rate-cell" ${percentStyle(gameRate)}>${pct(gameRate)}</td>` +
    `<td class="${streakClass}">${streak}</td>` +
    `<td class="${lastClass}" ${lastStyle}>${lastMatch}</td></tr>`;
}
