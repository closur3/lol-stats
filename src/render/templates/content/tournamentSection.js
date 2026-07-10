import { getFirstOverviewPage } from '../../../utils/data/overviewPages.js';
import { sortTeams } from '../../../utils/data/teamSort.js';
import { escapeHtml, escapeUrl } from '../../../utils/htmlEscape.js';
import { resolveScheduleMetaPhase } from '../../../utils/scheduleMetaPhase.js';
import { sortPolicy } from '../../../utils/sortPolicy.js';
import { summarizeFullRate } from '../../../core/analysis/fullRateSummary.js';
import { renderTeamRow } from '../../components/teamRow.js';
import { renderTimeTable } from '../../components/timeTable.js';
import { renderSchedulePhaseIcon } from '../../components/schedulePhaseIcon.js';

function buildTournamentSummary(stats) {
  const summary = summarizeFullRate(stats);
  const parts = summary.parts.map(part => `${part.label}: ${part.fullMatchCount}/${part.totalMatchCount} <span class="tournament-summary-rate">(${part.percentText})</span>`);
  const html = parts.length ? `<div class="tournament-summary">${parts.join(" <span class='summary-sep'>|</span> ")}</div>` : "";
  return { html, hasNoData: summary.hasNoData };
}

function readScheduleMeta(scheduleMetaBySlug, slug, isArchive) {
  if (isArchive) return null;
  const meta = scheduleMetaBySlug[slug];
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error(`scheduleMetaBySlug missing: ${slug}`);
  }
  return meta;
}

function buildTournamentTable(tournament, stats, sortMeta) {
  const tableId = `t_${String(tournament.slug).replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const rows = stats.map(teamStats => renderTeamRow(teamStats, tournament.slug, sortMeta)).join("");
  const tableBody = `<table id="${tableId}" data-sort-col="2" data-sort-dir-2="asc"><thead><tr><th class="team-col" onclick="doSort(0, '${tableId}')">TEAM</th><th colspan="2" onclick="doSort(2, '${tableId}')">BO3 FULLRATE</th><th colspan="2" onclick="doSort(4, '${tableId}')">BO5 FULLRATE</th><th colspan="2" onclick="doSort(5, '${tableId}')">SERIES</th><th colspan="2" onclick="doSort(7, '${tableId}')">GAMES</th><th class="col-streak" onclick="doSort(9, '${tableId}')">STREAK</th><th class="col-last" onclick="doSort(10, '${tableId}')">LAST DATE</th></tr></thead><tbody>${rows}</tbody></table>`;
  return tableBody;
}

export function renderTournamentSection(tournament, globalStats, timeGridBySlug, scheduleMetaBySlug, isArchive) {
  const meta = readScheduleMeta(scheduleMetaBySlug, tournament.slug, isArchive);
  const rawStats = globalStats[tournament.slug];
  if (!rawStats || typeof rawStats !== "object" || Array.isArray(rawStats)) {
    throw new Error(`globalStats missing: ${tournament.slug}`);
  }
  const tournamentTimeGrid = timeGridBySlug[tournament.slug];
  if (!tournamentTimeGrid || typeof tournamentTimeGrid !== "object" || Array.isArray(tournamentTimeGrid)) {
    throw new Error(`timeGrid missing: ${tournament.slug}`);
  }
  const stats = sortTeams(rawStats);
  const sortMeta = {
    bo3PriorMean: sortPolicy.getBestOfPriorMean(stats, 3),
    bo5PriorMean: sortPolicy.getBestOfPriorMean(stats, 5)
  };
  const summary = buildTournamentSummary(stats);
  const tableBody = buildTournamentTable(tournament, stats, sortMeta);
  const timeTableHtml = renderTimeTable(tournamentTimeGrid);

  let phaseIcon = "";
  let phase = null;
  if (!isArchive) {
    phase = resolveScheduleMetaPhase(meta);
    phaseIcon = renderSchedulePhaseIcon(phase);
  }
  const mainPage = getFirstOverviewPage(tournament.overviewPage);
  const pageUrl = `https://lol.fandom.com/wiki/${mainPage}`;
  const titleText = `<span class="tournament-title-text">${escapeHtml(tournament.name)}</span>`;
  const jumpBtn = `<a class="tournament-jump-btn" href="${escapeUrl(pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>`;
  const headerRight = `<div class="title-right-area">${summary.html}</div>`;

  if (isArchive) {
    return `<details class="home-sec archive-sec"><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${titleText}${jumpBtn}</div> ${headerRight}</summary><div class="wrapper">${tableBody}${timeTableHtml}</div></details>`;
  }

  const isSleepCollapsed = phase === "offday";
  const openAttr = (isSleepCollapsed || summary.hasNoData) ? "" : " open";
  return `<details class="home-sec"${openAttr}><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${phaseIcon}${titleText}${jumpBtn}</div> ${headerRight}</summary><div class="wrapper">${tableBody}${timeTableHtml}</div></details>`;
}
