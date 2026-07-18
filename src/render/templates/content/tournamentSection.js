import { getFirstOverviewPage } from '../../../utils/data/overviewPages.js';
import { sortTeams } from '../../../utils/data/teamSort.js';
import { escapeHtml, escapeUrl } from '../../../utils/htmlEscape.js';
import { resolveSchedulePhase } from '../../../core/scheduler/schedulePlanBuilder.js';
import { sortPolicy } from '../../../utils/sortPolicy.js';
import { summarizeFullRate } from '../../../core/analysis/fullRateSummary.js';
import { renderTeamRow } from '../../components/teamRow.js';
import { renderTimeTable } from '../../components/timeTable.js';
import { renderSchedulePhaseIcon } from '../../components/schedulePhaseIcon.js';

function renderTournamentSummary(stats) {
  const summary = summarizeFullRate(stats);
  const parts = summary.parts.map(part => `${part.label}: ${part.fullMatchCount}/${part.totalMatchCount} <span class="tournament-summary-rate">(${part.percentText})</span>`);
  return parts.length ? `<div class="tournament-summary">${parts.join(" <span class='summary-sep'>|</span> ")}</div>` : "";
}

function readScheduleSessions(scheduleSessionsBySlug, slug, isArchive) {
  if (isArchive) return null;
  const scheduleSessions = scheduleSessionsBySlug[slug];
  if (!scheduleSessions || typeof scheduleSessions !== "object" || Array.isArray(scheduleSessions)) {
    throw new Error(`scheduleSessionsBySlug missing: ${slug}`);
  }
  return scheduleSessions;
}

function buildTournamentTable(tournament, stats, sortMeta) {
  const tableId = `t_${String(tournament.slug).replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const rows = stats.map(teamStats => renderTeamRow(teamStats, tournament.slug, sortMeta)).join("");
  const columnWidths = `<colgroup><col class="width-team"><col span="12" class="width-stat"><col class="width-streak"><col class="width-last"></colgroup>`;
  const tableBody = `<table id="${tableId}" class="stats-table" data-sort-col="2" data-sort-dir-2="asc">${columnWidths}<thead><tr><th class="team-col" onclick="doSort(0, '${tableId}')">TEAM</th><th colspan="2" onclick="doSort(2, '${tableId}')">BO3 FULLRATE</th><th colspan="2" onclick="doSort(4, '${tableId}')">BO5 FULLRATE</th><th colspan="2" onclick="doSort(5, '${tableId}')">SERIES</th><th colspan="2" onclick="doSort(7, '${tableId}')">GAMES</th><th colspan="2" onclick="doSort(10, '${tableId}')">COME BACK</th><th colspan="2" onclick="doSort(12, '${tableId}')">LOST LEAD</th><th class="col-streak" onclick="doSort(13, '${tableId}')">STREAK</th><th class="col-last" onclick="doSort(14, '${tableId}')">LAST DATE</th></tr></thead><tbody>${rows}</tbody></table>`;
  return tableBody;
}

export function renderTournamentSection(tournament, globalStats, timeGridBySlug, scheduleSessionsBySlug, isArchive) {
  const scheduleSessions = readScheduleSessions(scheduleSessionsBySlug, tournament.slug, isArchive);
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
    bo5PriorMean: sortPolicy.getBestOfPriorMean(stats, 5),
    comebackPriorMean: sortPolicy.getRatePriorMean(stats, "comebackCount", "seriesTrailedCount"),
    lostLeadPriorMean: sortPolicy.getRatePriorMean(stats, "lostLeadCount", "seriesLedCount")
  };
  const summaryHtml = renderTournamentSummary(stats);
  const tableBody = buildTournamentTable(tournament, stats, sortMeta);
  const artifactKey = `${isArchive ? "ArchiveSnapshot" : "ActiveHome"}_${tournament.slug}`;
  const timeTableHtml = renderTimeTable(tournamentTimeGrid, artifactKey);

  let phaseIcon = "";
  let phase = null;
  if (!isArchive) {
    phase = resolveSchedulePhase(scheduleSessions);
    phaseIcon = renderSchedulePhaseIcon(phase);
  }
  const mainPage = getFirstOverviewPage(tournament.overviewPage);
  const pageUrl = `https://lol.fandom.com/wiki/${mainPage}`;
  const titleText = `<span class="tournament-title-text">${escapeHtml(tournament.name)}</span>`;
  const jumpBtn = `<a class="tournament-jump-btn" href="${escapeUrl(pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>`;
  const headerRight = `<div class="title-right-area">${summaryHtml}</div>`;

  if (isArchive) {
    return `<details class="home-sec"><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${titleText}${jumpBtn}</div> ${headerRight}</summary><div class="wrapper">${tableBody}${timeTableHtml}</div></details>`;
  }

  const openAttr = phase === "offday" ? "" : " open";
  return `<details class="home-sec"${openAttr}><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${phaseIcon}${titleText}${jumpBtn}</div> ${headerRight}</summary><div class="wrapper">${tableBody}${timeTableHtml}</div></details>`;
}
