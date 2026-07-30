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

function renderStatisticsBody(tournament, section, scope, sectionIndex) {
  const sortMeta = buildSortMeta(section.stats);
  const rows = section.stats
    .map(teamStats => renderTeamRow(teamStats, tournament.slug, scope, sortMeta, Boolean(section.groupDisplay)))
    .join("");
  if (!section.groupDisplay) return `<tbody>${rows}</tbody>`;
  return `<tbody class="stats-group-body stats-group-color-${sectionIndex % 4}">${rows}</tbody>`;
}

function buildTournamentTable(tournament, sections, scope, tableSuffix) {
  const tableId = `t_${normalizeId(tournament.slug)}_${normalizeId(tableSuffix)}`;
  const bodies = sections
    .map((section, sectionIndex) => renderStatisticsBody(tournament, section, scope, sectionIndex))
    .join("");
  const columnWidths = `<colgroup><col class="width-team"><col span="12" class="width-stat"><col class="width-streak"><col class="width-last"></colgroup>`;
  return `<table id="${tableId}" class="stats-table" data-sort-col="2" data-sort-dir-2="asc">${columnWidths}<thead><tr><th class="team-col" onclick="doSort(0, '${tableId}')">TEAM</th><th colspan="2" onclick="doSort(2, '${tableId}')">BO3 FULLRATE</th><th colspan="2" onclick="doSort(4, '${tableId}')">BO5 FULLRATE</th><th colspan="2" onclick="doSort(5, '${tableId}')">SERIES</th><th colspan="2" onclick="doSort(7, '${tableId}')">GAMES</th><th colspan="2" onclick="doSort(10, '${tableId}')">COME BACK</th><th colspan="2" onclick="doSort(12, '${tableId}')">LOST LEAD</th><th class="col-streak" onclick="doSort(13, '${tableId}')">STREAK</th><th class="col-last" onclick="doSort(14, '${tableId}')">LAST DATE</th></tr></thead>${bodies}</table>`;
}

function readStatisticsSections(page) {
  const visibleStats = sortTeams(page.stats);
  if (visibleStats.length === 0) return [];
  if (page.groups.length === 0) {
    return [{ groupDisplay: null, stats: visibleStats }];
  }

  return page.groups.flatMap(group => {
    const groupTeams = new Set(group.teams);
    const groupStats = visibleStats.filter(teamStats => groupTeams.has(teamStats.name));
    return groupStats.length === 0
      ? []
      : [{ groupDisplay: group.groupDisplay, stats: groupStats }];
  });
}

function renderGroupLegend(page) {
  const sections = readStatisticsSections(page).filter(section => section.groupDisplay);
  if (sections.length === 0) return "";
  const entries = sections.map((section, sectionIndex) => (
    `<span class="stats-group-legend-item stats-group-color-${sectionIndex % 4}"><span class="stats-group-legend-mark" aria-hidden="true"></span><span class="stats-group-legend-name">${escapeHtml(section.groupDisplay)}</span><span class="stats-group-legend-count" aria-label="${section.stats.length} teams">${section.stats.length}</span></span>`
  )).join("");
  return `<div class="stats-group-legend" aria-label="Participant groups">${entries}</div>`;
}

function renderStatisticsView(tournament, page, tablePrefix) {
  const sections = readStatisticsSections(page);
  return sections.length > 0
    ? buildTournamentTable(tournament, sections, page.overviewPage, tablePrefix)
    : `<div class="stats-view-empty">NO SCHEDULED TEAMS</div>`;
}

function readOverviewPageLabel(overviewPage) {
  const parts = overviewPage.split("/");
  return (parts[parts.length - 1] || overviewPage).replaceAll("_", " ");
}

function renderPageStatistics(tournament, page, pageIndex) {
  const pageUrl = `https://lol.fandom.com/wiki/${page.overviewPage}`;
  const pageTitle = readOverviewPageLabel(page.overviewPage);
  const pageNumber = String(pageIndex + 1).padStart(2, "0");
  const groupLegend = renderGroupLegend(page);
  const jumpButton = `<a class="stats-page-jump" href="${escapeUrl(pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(pageTitle)}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>`;
  const headingLeft = `<div class="stats-page-title-row"><span class="stats-page-index">${pageNumber}</span><span class="stats-heading-name">${escapeHtml(pageTitle)}</span>${jumpButton}</div>`;
  const headingRight = `<div class="stats-page-heading-meta">${groupLegend}</div>`;
  return `<section class="stats-page-block"><div class="stats-page-heading">${headingLeft}${headingRight}</div>${renderStatisticsView(tournament, page, `p${pageIndex}`)}</section>`;
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

function renderStatisticsControls(rootId) {
  const rootIdArgument = escapeJsArg(rootId);
  const stopSummaryToggle = "event.preventDefault(); event.stopPropagation();";
  return `<div class="statistics-toolbar"><div class="statistics-switch" role="group" aria-label="Statistics view"><button type="button" class="statistics-switch-option is-active" data-statistics-target="combined" aria-pressed="true" onclick="${stopSummaryToggle} setStatisticsView(${rootIdArgument}, 'combined')">MERGED</button><button type="button" class="statistics-switch-option" data-statistics-target="separated" aria-pressed="false" onclick="${stopSummaryToggle} setStatisticsView(${rootIdArgument}, 'separated')">SPLIT</button></div></div>`;
}

function renderStatistics(tournament, statistics) {
  assertStatistics(tournament, statistics);
  if (statistics.pages.length === 1) {
    return {
      content: renderStatisticsView(tournament, statistics.pages[0], "single"),
      controls: "",
      legend: renderGroupLegend(statistics.pages[0]),
      rootId: null
    };
  }

  const combined = renderStatisticsView(
    tournament,
    { overviewPage: "combined", groups: [], stats: statistics.combined },
    "combined"
  );
  const visiblePages = statistics.pages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => sortTeams(page.stats).length > 0);
  if (visiblePages.length < 2) {
    const visiblePage = visiblePages[0]?.page;
    return visiblePage
      ? {
          content: renderStatisticsView(tournament, visiblePage, "single"),
          controls: "",
          legend: renderGroupLegend(visiblePage),
          rootId: null
        }
      : { content: combined, controls: "", legend: "", rootId: null };
  }

  const rootId = `statistics_${normalizeId(tournament.slug)}`;
  const separated = visiblePages
    .reverse()
    .map(({ page, index }) => renderPageStatistics(tournament, page, index))
    .join("");
  return {
    content: `<div class="statistics-view" data-statistics-mode="combined">${combined}</div><div class="statistics-view is-hidden" data-statistics-mode="separated" aria-hidden="true"><div class="stats-page-list">${separated}</div></div>`,
    controls: renderStatisticsControls(rootId),
    legend: "",
    rootId
  };
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
  const statisticsLayout = renderStatistics(tournament, statistics);
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
  const headerDetails = `${statisticsLayout.controls}${statisticsLayout.legend}`;
  const headerStatistics = `<div class="statistics-heading-meta">${summaryHtml}${headerDetails}</div>`;
  const headerRight = `<div class="title-right-area">${headerStatistics}</div>`;
  const sectionBody = `<div class="wrapper">${statisticsLayout.content}${timeTableHtml}</div>`;
  const statisticsRoot = statisticsLayout.rootId
    ? ` id="${statisticsLayout.rootId}" data-statistics-view="combined"`
    : "";
  const detailsClass = statisticsLayout.rootId ? "home-sec statistics-root" : "home-sec";

  if (isArchive) {
    return `<details class="${detailsClass}"${statisticsRoot}><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${titleText}${jumpBtn}</div> ${headerRight}</summary>${sectionBody}</details>`;
  }

  const openAttr = phase === "offday" ? "" : " open";
  return `<details class="${detailsClass}"${statisticsRoot}${openAttr}><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${phaseIcon}${titleText}${jumpBtn}</div> ${headerRight}</summary>${sectionBody}</details>`;
}
