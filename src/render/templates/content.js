import { renderTournamentSection } from './content/tournamentSection.js';
import { renderScheduleSection } from './content/scheduleSection.js';
import { serializeForInlineScript } from '../../utils/htmlEscape.js';

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
}

function assertTournaments(tournaments) {
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }
}

export function renderContentFragment(statisticsBySlug, timeDistributionBySlug, scheduleMap, tournaments, isArchive = false, scheduleSessionsBySlug, modalHistory) {
  assertObject(statisticsBySlug, "statisticsBySlug");
  assertObject(timeDistributionBySlug, "timeDistributionBySlug");
  assertObject(scheduleMap, "scheduleMap");
  assertTournaments(tournaments);
  if (!Array.isArray(modalHistory)) throw new Error("modalHistory must be an array");
  if (!isArchive) {
    assertObject(scheduleSessionsBySlug, "scheduleSessionsBySlug");
  }

  const combinedStatsBySlug = Object.fromEntries(tournaments.map(tournament => {
    const statistics = statisticsBySlug[tournament.slug];
    if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) {
      throw new Error(`statisticsBySlug missing: ${tournament.slug}`);
    }
    if (!statistics.combined || typeof statistics.combined !== "object" || Array.isArray(statistics.combined)) {
      throw new Error(`statistics.combined missing: ${tournament.slug}`);
    }
    return [tournament.slug, statistics.combined];
  }));
  const injectedData = `<script>window.tournamentStatistics = Object.assign(window.tournamentStatistics ?? {}, ${serializeForInlineScript(statisticsBySlug)});window.gModalHistory = ${serializeForInlineScript(modalHistory)};</script>`;
  const tablesHtml = tournaments
    .filter(tournament => tournament?.slug)
    .map(tournament => renderTournamentSection(tournament, statisticsBySlug, timeDistributionBySlug, scheduleSessionsBySlug, isArchive))
    .join("");
  const scheduleHtml = isArchive ? "" : renderScheduleSection(scheduleMap, combinedStatsBySlug);

  return `${tablesHtml} ${scheduleHtml} ${injectedData}`;
}

export function renderArchiveContentFragment(statisticsBySlug, timeDistributionBySlug, tournaments, modalHistory) {
  return renderContentFragment(statisticsBySlug, timeDistributionBySlug, {}, tournaments, true, null, modalHistory);
}
