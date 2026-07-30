import { getFirstOverviewPage } from '../../../utils/data/overviewPages.js';
import { sortTeams } from '../../../utils/data/teamSort.js';
import { escapeHtml, escapeJsArg, escapeUrl } from '../../../utils/htmlEscape.js';
import { resolveSchedulePhase } from '../../../core/scheduler/scheduleDay.js';
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

function buildSortMeta(stats) {
  return {
    bo3PriorMean: sortPolicy.getBestOfPriorMean(stats, 3),
    bo5PriorMean: sortPolicy.getBestOfPriorMean(stats, 5),
    comebackPriorMean: sortPolicy.getRatePriorMean(stats, "comebackCount", "seriesTrailedCount"),
    lostLeadPriorMean: sortPolicy.getRatePriorMean(stats, "lostLeadCount", "seriesLedCount")
  };
}

function normalizeId(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/g, '_');
}

function buildTournamentTable(tournament, stats, scope, tableSuffix) {
  const tableId = `t_${normalizeId(tournament.slug)}_${normalizeId(tableSuffix)}`;
  const sortMeta = buildSortMeta(stats);
  const rows = stats.map(teamStats => renderTeamRow(teamStats, tournament.slug, scope, sortMeta)).join("");
  const columnWidths = `<colgroup><col class="width-team"><col span="12" class="width-stat"><col class="width-streak"><col class="width-last"></colgroup>`;
  return `<table id="${tableId}" class="stats-table" data-sort-col="2" data-sort-dir-2="asc">${columnWidths}<thead><tr><th class="team-col" onclick="doSort(0, '${tableId}')">TEAM</th><th colspan="2" onclick="doSort(2, '${tableId}')">BO3 FULLRATE</th><th colspan="2" onclick="doSort(4, '${tableId}')">BO5 FULLRATE</th><th colspan="2" onclick="doSort(5, '${tableId}')">SERIES</th><th colspan="2" onclick="doSort(7, '${tableId}')">GAMES</th><th colspan="2" onclick="doSort(10, '${tableId}')">COME BACK</th><th colspan="2" onclick="doSort(12, '${tableId}')">LOST LEAD</th><th class="col-streak" onclick="doSort(13, '${tableId}')">STREAK</th><th class="col-last" onclick="doSort(14, '${tableId}')">LAST DATE</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderStatisticsView(tournament, page, tablePrefix) {
  const visibleStats = sortTeams(page.stats);
  if (visibleStats.length === 0) {
    return `<div class="stats-view-empty">NO SCHEDULED TEAMS</div>`;
  }
  if (page.groups.length === 0) {
    return buildTournamentTable(tournament, visibleStats, page.overviewPage, tablePrefix);
  }

  const groupBlocks = page.groups.map((group, groupIndex) => {
    const groupTeams = new Set(group.teams);
    const groupStats = visibleStats.filter(teamStats => groupTeams.has(teamStats.name));
    if (groupStats.length === 0) return "";
    const table = buildTournamentTable(
      tournament,
      groupStats,
      page.overviewPage,
      `${tablePrefix}_g${groupIndex}`
    );
    return `<section class="stats-group-block"><div class="stats-group-heading"><span class="stats-group-mark" aria-hidden="true"></span><span class="stats-heading-name">${escapeHtml(group.groupDisplay)}</span><span class="stats-heading-count">${groupStats.length} TEAMS</span></div>${table}</section>`;
  }).join("");
  return groupBlocks
    ? `<div class="stats-group-list">${groupBlocks}</div>`
    : `<div class="stats-view-empty">NO SCHEDULED TEAMS</div>`;
}

function readOverviewPageLabel(overviewPage) {
  const parts = overviewPage.split("/");
  return (parts[parts.length - 1] || overviewPage).replaceAll("_", " ");
}

function renderPageStatistics(tournament, page, pageIndex) {
  const pageUrl = `https://lol.fandom.com/wiki/${page.overviewPage}`;
  const pageTitle = readOverviewPageLabel(page.overviewPage);
  const teamCount = sortTeams(page.stats).length;
  const pageNumber = String(pageIndex + 1).padStart(2, "0");
  const jumpButton = `<a class="stats-page-jump" href="${escapeUrl(pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(pageTitle)}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>`;
  return `<section class="stats-page-block"><div class="stats-page-heading"><span class="stats-page-index">${pageNumber}</span><span class="stats-heading-name">${escapeHtml(pageTitle)}</span>${jumpButton}<span class="stats-heading-count">${teamCount} TEAMS</span></div>${renderStatisticsView(tournament, page, `p${pageIndex}`)}</section>`;
}

function assertStatistics(tournament, statistics) {
  if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) {
    throw new Error(`statistics missing: ${tournament.slug}`);
  }
  if (!statistics.combined || typeof statistics.combined !== "object" || Array.isArray(statistics.combined)) {
    throw new Error(`statistics.combined missing: ${tournament.slug}`);
  }
  if (!Array.isArray(statistics.pages) || statistics.pages.length !== tournament.overviewPage.length) {
    throw new Error(`statistics.pages mismatch: ${tournament.slug}`);
  }
  statistics.pages.forEach((page, index) => {
    if (
      !page
      || page.overviewPage !== tournament.overviewPage[index]
      || !Array.isArray(page.groups)
      || !page.stats
      || typeof page.stats !== "object"
      || Array.isArray(page.stats)
    ) {
      throw new Error(`statistics.pages[${index}] invalid: ${tournament.slug}`);
    }
  });
}

function renderStatistics(tournament, statistics) {
  assertStatistics(tournament, statistics);
  if (statistics.pages.length === 1) {
    return renderStatisticsView(tournament, statistics.pages[0], "single");
  }

  const rootId = `statistics_${normalizeId(tournament.slug)}`;
  const rootIdArgument = escapeJsArg(rootId);
  const combinedStats = sortTeams(statistics.combined);
  const combined = buildTournamentTable(tournament, combinedStats, "combined", "combined");
  const separated = statistics.pages
    .map((page, index) => renderPageStatistics(tournament, page, index))
    .join("");
  const mergedIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 7h12M6 3v10"/></svg>`;
  const splitIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="3" width="5.5" height="10" rx="1.5"/><rect x="9" y="3" width="5.5" height="10" rx="1.5"/></svg>`;
  const toolbar = `<div class="statistics-toolbar"><span class="statistics-toolbar-label">TABLE VIEW</span><div class="statistics-switch" role="group" aria-label="Statistics view"><button type="button" class="statistics-switch-option is-active" data-statistics-target="combined" aria-pressed="true" onclick="setStatisticsView(${rootIdArgument}, 'combined')">${mergedIcon}<span>MERGED</span></button><button type="button" class="statistics-switch-option" data-statistics-target="separated" aria-pressed="false" onclick="setStatisticsView(${rootIdArgument}, 'separated')">${splitIcon}<span>SPLIT</span></button></div><span class="statistics-toolbar-meta">${statistics.pages.length} SOURCE PAGES</span></div>`;
  return `<div id="${rootId}" class="statistics-root" data-statistics-view="combined">${toolbar}<div class="statistics-view" data-statistics-mode="combined">${combined}</div><div class="statistics-view is-hidden" data-statistics-mode="separated" aria-hidden="true"><div class="stats-page-list">${separated}</div></div></div>`;
}

export function renderTournamentSection(tournament, statisticsBySlug, timeGridBySlug, scheduleSessionsBySlug, isArchive) {
  const scheduleSessions = readScheduleSessions(scheduleSessionsBySlug, tournament.slug, isArchive);
  const statistics = statisticsBySlug[tournament.slug];
  assertStatistics(tournament, statistics);
  const tournamentTimeGrid = timeGridBySlug[tournament.slug];
  if (!tournamentTimeGrid || typeof tournamentTimeGrid !== "object" || Array.isArray(tournamentTimeGrid)) {
    throw new Error(`timeGrid missing: ${tournament.slug}`);
  }
  const combinedStats = sortTeams(statistics.combined);
  const summaryHtml = renderTournamentSummary(combinedStats);
  const statisticsHtml = renderStatistics(tournament, statistics);
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
  const sectionBody = `<div class="wrapper">${statisticsHtml}${timeTableHtml}</div>`;

  if (isArchive) {
    return `<details class="home-sec"><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${titleText}${jumpBtn}</div> ${headerRight}</summary>${sectionBody}</details>`;
  }

  const openAttr = phase === "offday" ? "" : " open";
  return `<details class="home-sec"${openAttr}><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${phaseIcon}${titleText}${jumpBtn}</div> ${headerRight}</summary>${sectionBody}</details>`;
}
