import { getFirstOverviewPage, getOverviewPageLabel } from '../../../utils/data/overviewPages.js';
import { sortTeams } from '../../../utils/data/teamSort.js';
import { escapeHtml, escapeUrl } from '../../../utils/htmlEscape.js';
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

function formatGroupDisplay(groupDisplay) {
  return groupDisplay.replace(/\bgroup\b/gi, "").replace(/\s+/g, " ").trim();
}

function renderGroupLegend(page) {
  const sections = readStatisticsSections(page).filter(section => section.groupDisplay);
  if (sections.length === 0) return "";
  const entries = sections.map((section, sectionIndex) => (
    `<span class="stats-group-legend-item stats-group-color-${sectionIndex % 4}"><span class="stats-group-legend-mark" aria-hidden="true"></span><span class="stats-group-legend-name">${escapeHtml(formatGroupDisplay(section.groupDisplay))}</span><span class="stats-group-legend-count" aria-label="${section.stats.length} teams">${section.stats.length}</span></span>`
  )).join("");
  return `<div class="stats-group-legend" aria-label="Participant groups">${entries}</div>`;
}

function renderStatisticsView(tournament, page, tablePrefix) {
  const sections = readStatisticsSections(page);
  return sections.length > 0
    ? buildTournamentTable(tournament, sections, page.overviewPage, tablePrefix)
    : `<div class="stats-view-empty">NO SCHEDULED TEAMS</div>`;
}

function renderTournamentJumpIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
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

function renderTournamentJump(overviewPage, scope = null, isActive = true) {
  const pageUrl = `https://lol.fandom.com/wiki/${overviewPage}`;
  const scopeAttributes = scope === null
    ? ""
    : ` data-statistics-scope-jump="${scope}" aria-hidden="${String(!isActive)}"`;
  const hiddenClass = isActive ? "" : " is-hidden";
  return `<a class="tournament-jump-btn statistics-scope-jump${hiddenClass}"${scopeAttributes} href="${escapeUrl(pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(getOverviewPageLabel(overviewPage))}" onclick="event.stopPropagation()">${renderTournamentJumpIcon()}</a>`;
}

function renderTournamentJumpMenu(tournament, scope = null, isActive = true) {
  const scopeAttributes = scope === null
    ? ""
    : ` data-statistics-scope-jump="${scope}" aria-hidden="${String(!isActive)}"`;
  const hiddenClass = isActive ? "" : " is-hidden";
  const menuId = `fandom_sources_${normalizeId(tournament.slug)}`;
  const links = tournament.overviewPage.map(overviewPage => {
    const label = getOverviewPageLabel(overviewPage);
    return `<a class="tournament-source-option" href="${escapeUrl(`https://lol.fandom.com/wiki/${overviewPage}`)}" target="_blank" rel="noopener noreferrer" role="menuitem" onclick="event.stopPropagation(); closeTournamentSourceMenus()">${escapeHtml(label)}</a>`;
  }).join("");
  return `<span class="tournament-source-menu statistics-scope-jump${hiddenClass}"${scopeAttributes}><button type="button" class="tournament-jump-btn tournament-source-trigger" aria-label="Choose Fandom source page" aria-expanded="false" aria-controls="${menuId}" onclick="event.stopPropagation(); toggleTournamentSourceMenu(this)">${renderTournamentJumpIcon()}</button><span id="${menuId}" class="tournament-source-options" role="menu" aria-hidden="true">${links}</span></span>`;
}

function renderOverallTournamentJump(tournament, scope = null, isActive = true) {
  return tournament.overviewPage.length === 1
    ? renderTournamentJump(tournament.overviewPage[0], scope, isActive)
    : renderTournamentJumpMenu(tournament, scope, isActive);
}

function renderScopeSummary(scope, stats, isActive) {
  const hiddenClass = isActive ? "" : " is-hidden";
  return `<div class="statistics-scope-summary${hiddenClass}" data-statistics-scope-summary="${scope}" aria-hidden="${String(!isActive)}">${renderTournamentSummary(sortTeams(stats))}</div>`;
}

function renderScopeLegend(scope, page, isActive) {
  const hiddenClass = isActive ? "" : " is-hidden";
  return `<div class="statistics-scope-legend${hiddenClass}" data-statistics-scope-legend="${scope}" aria-hidden="${String(!isActive)}">${page ? renderGroupLegend(page) : ""}</div>`;
}

function renderScopeContent(scope, content, isActive) {
  const hiddenClass = isActive ? "" : " is-hidden";
  return `<div class="statistics-scope-content${hiddenClass}" data-statistics-scope-content="${scope}" aria-hidden="${String(!isActive)}">${content}</div>`;
}

function renderScopeSelect(scopes) {
  const options = scopes.map((scope, index) => `<button type="button" class="compact-menu-option${index === 0 ? " is-selected" : ""}" role="option" aria-selected="${String(index === 0)}" data-statistics-scope-value="${escapeHtml(scope.key)}" data-statistics-scope-label="${escapeHtml(scope.label)}" onclick="event.stopPropagation(); setStatisticsScope(this)">${escapeHtml(scope.label)}</button>`).join("");
  return `<div class="statistics-scope-select compact-menu" data-statistics-scope-select><button type="button" class="statistics-scope-trigger compact-menu-trigger" aria-label="Statistics scope" aria-expanded="false" onclick="event.stopPropagation(); toggleCompactMenu(this)"><span class="compact-menu-value">${escapeHtml(scopes[0].label)}</span></button><div class="statistics-scope-menu compact-menu-popup" role="listbox" aria-hidden="true">${options}</div></div>`;
}

function renderStatistics(tournament, statistics, timeTables) {
  assertStatistics(tournament, statistics);
  if (statistics.pages.length === 1) {
    return {
      content: `${renderStatisticsView(tournament, statistics.pages[0], "single")}${timeTables.combined}`,
      summary: renderTournamentSummary(sortTeams(statistics.pages[0].stats)),
      legend: renderGroupLegend(statistics.pages[0]),
      select: "",
      jump: renderTournamentJump(statistics.pages[0].overviewPage),
      hasScopes: false
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
          content: `${renderStatisticsView(tournament, visiblePage, "single")}${timeTables.combined}`,
          summary: renderTournamentSummary(sortTeams(visiblePage.stats)),
          legend: renderGroupLegend(visiblePage),
          select: "",
          jump: renderTournamentJump(visiblePage.overviewPage),
          hasScopes: false
        }
      : {
          content: `${combined}${timeTables.combined}`,
          summary: renderTournamentSummary(sortTeams(statistics.combined)),
          legend: "",
          select: "",
          jump: renderOverallTournamentJump(tournament),
          hasScopes: false
        };
  }

  const scopes = [
    {
      key: "overall",
      label: "Overall",
      overviewPage: getFirstOverviewPage(tournament.overviewPage),
      stats: statistics.combined,
      page: null,
      content: `${combined}${timeTables.combined}`
    },
    ...visiblePages.reverse().map(({ page, index }) => ({
      key: `page-${index}`,
      label: getOverviewPageLabel(page.overviewPage),
      overviewPage: page.overviewPage,
      stats: page.stats,
      page,
      content: `${renderStatisticsView(tournament, page, `p${index}`)}${timeTables.pages.get(page.overviewPage)}`
    }))
  ];
  const summaries = scopes.map((scope, index) => renderScopeSummary(scope.key, scope.stats, index === 0)).join("");
  const legends = scopes.map((scope, index) => renderScopeLegend(scope.key, scope.page, index === 0)).join("");
  const jumps = scopes.map((scope, index) => scope.key === "overall"
    ? renderOverallTournamentJump(tournament, scope.key, index === 0)
    : renderTournamentJump(scope.overviewPage, scope.key, index === 0)).join("");
  const contents = scopes.map((scope, index) => renderScopeContent(scope.key, scope.content, index === 0)).join("");
  return {
    content: contents,
    summary: summaries,
    legend: legends,
    select: renderScopeSelect(scopes),
    jump: jumps,
    hasScopes: true
  };
}

export function renderTournamentSection(tournament, statisticsBySlug, timeGridBySlug, scheduleSessionsBySlug, isArchive) {
  const scheduleSessions = readScheduleSessions(scheduleSessionsBySlug, tournament.slug, isArchive);
  const statistics = statisticsBySlug[tournament.slug];
  assertStatistics(tournament, statistics);
  const tournamentTimeGrid = timeGridBySlug[tournament.slug];
  if (!tournamentTimeGrid || typeof tournamentTimeGrid !== "object" || Array.isArray(tournamentTimeGrid) || !tournamentTimeGrid.combined || !Array.isArray(tournamentTimeGrid.pages)) {
    throw new Error(`timeGrid missing: ${tournament.slug}`);
  }
  const artifactKey = `${isArchive ? "ArchiveSnapshot" : "ActiveHome"}_${tournament.slug}`;
  if (tournamentTimeGrid.pages.length !== tournament.overviewPage.length) throw new Error(`timeGrid.pages mismatch: ${tournament.slug}`);
  const timeTables = {
    combined: renderTimeTable(tournamentTimeGrid.combined, artifactKey),
    pages: new Map(tournamentTimeGrid.pages.map(page => [page.overviewPage, renderTimeTable(page.timeGrid, `${artifactKey}_${normalizeId(page.overviewPage)}`)]))
  };
  const statisticsLayout = renderStatistics(tournament, statistics, timeTables);

  let phaseIcon = "";
  let phase = null;
  if (!isArchive) {
    phase = resolveSchedulePhase(scheduleSessions);
    phaseIcon = renderSchedulePhaseIcon(phase);
  }
  const titleText = `<span class="tournament-title-text">${escapeHtml(tournament.name)}</span>`;
  const hasHeadingDetails = Boolean(statisticsLayout.select || statisticsLayout.legend);
  const divider = hasHeadingDetails ? `<span class="statistics-heading-divider" aria-hidden="true"></span>` : "";
  const scopeClass = statisticsLayout.select ? " has-scope-select" : "";
  const headerStatistics = `<div class="statistics-heading-meta${scopeClass}">${statisticsLayout.summary}${divider}${statisticsLayout.select}${statisticsLayout.legend}</div>`;
  const headerRight = `<div class="title-right-area">${headerStatistics}</div>`;
  const sectionBody = `<div class="wrapper">${statisticsLayout.content}</div>`;
  const statisticsRoot = statisticsLayout.hasScopes
    ? ` id="statistics_${normalizeId(tournament.slug)}" data-statistics-scope="overall"`
    : "";
  const detailsClass = statisticsLayout.hasScopes ? "home-sec statistics-root" : "home-sec";

  if (isArchive) {
    return `<details class="${detailsClass}"${statisticsRoot}><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${titleText}${statisticsLayout.jump}</div> ${headerRight}</summary>${sectionBody}</details>`;
  }

  const openAttr = phase === "offday" ? "" : " open";
  return `<details class="${detailsClass}"${statisticsRoot}${openAttr}><summary class="table-title home-sum"><div class="tournament-title-row"><span class="home-indicator">❯</span>${phaseIcon}${titleText}${statisticsLayout.jump}</div> ${headerRight}</summary>${sectionBody}</details>`;
}
