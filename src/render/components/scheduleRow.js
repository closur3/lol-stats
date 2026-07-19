import { renderRateBadge } from './rateBadge.js';
import { escapeHtml, escapeJsArg } from '../../utils/htmlEscape.js';

export function renderScheduleRow(match, globalStats) {
  const bestOfLabel = `BO${match.bestOf}`;
  const bestOfClass = `best-of-pill bo${match.bestOf}`;
  const isTbd1 = match.team1Name === "TBD", isTbd2 = match.team2Name === "TBD";
  const team1Argument = escapeJsArg(match.team1Name);
  const team2Argument = escapeJsArg(match.team2Name);
  const safeDisplay1 = escapeHtml(match.team1Name);
  const safeDisplay2 = escapeHtml(match.team2Name);
  const team1ClickHandler = isTbd1 ? "" : `onclick="openTeam(${team1Argument})"`;
  const team2ClickHandler = isTbd2 ? "" : `onclick="openTeam(${team2Argument})"`;
  const team1RateHint = renderRateBadge(match.team1Name, match.slug, match.bestOf, globalStats);
  const team2RateHint = renderRateBadge(match.team2Name, match.slug, match.bestOf, globalStats);

  let midContent = `<span class="vs-text">vs</span>`;
  if (match.isFinished) {
    const team1ScoreClass = match.winner === 1 ? "score-win" : match.winner === 2 ? "score-loss" : "score-draw";
    const team2ScoreClass = match.winner === 2 ? "score-win" : match.winner === 1 ? "score-loss" : "score-draw";
    const forfeitLabel = match.isForfeit ? `<span class="match-forfeit">FF</span>` : "";
    midContent = `<span class="sch-fin-score"><span class="${team1ScoreClass}">${match.team1Score}</span><span class="score-sep">-</span><span class="${team2ScoreClass}">${match.team2Score}</span>${forfeitLabel}</span>`;
  } else if (match.isLive) {
    midContent = `<span class="sch-live-score">${match.team1Score}<span class="score-sep">-</span>${match.team2Score}</span>`;
  }

  const h2hClass = (!isTbd1 && !isTbd2) ? "spine-sep clickable" : "spine-sep";
  const h2hClick = (!isTbd1 && !isTbd2) ? `onclick="openH2H(${team1Argument}, ${team2Argument})"` : "";

  return `<div class="sch-row"><span class="sch-time">${escapeHtml(match.time)}</span><div class="sch-vs-container"><div class="spine-row"><span class="${isTbd1 ? "spine-l tbd-team" : "spine-l clickable"}" ${team1ClickHandler}>${team1RateHint}${safeDisplay1}</span><span class="${h2hClass} sch-mid-cell" ${h2hClick}>${midContent}</span><span class="${isTbd2 ? "spine-r tbd-team" : "spine-r clickable"}" ${team2ClickHandler}>${safeDisplay2}${team2RateHint}</span></div></div><div class="sch-tag-col"><span class="${bestOfClass}">${bestOfLabel}</span></div></div>`;
}
