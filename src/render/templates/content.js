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

export function renderContentFragment(statisticsByName, timeDistributionByName, scheduleMap, tournaments, isArchive = false, scheduleSessionsByName, modalHistory) {
  assertObject(statisticsByName, "statisticsByName");
  assertObject(timeDistributionByName, "timeDistributionByName");
  assertObject(scheduleMap, "scheduleMap");
  assertTournaments(tournaments);
  if (!Array.isArray(modalHistory)) throw new Error("modalHistory must be an array");
  if (!isArchive) {
    assertObject(scheduleSessionsByName, "scheduleSessionsByName");
  }

  const combinedStatsByName = Object.fromEntries(tournaments.map(tournament => {
    const statistics = statisticsByName[tournament.name];
    if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) {
      throw new Error(`statisticsByName missing: ${tournament.name}`);
    }
    if (!statistics.combined || typeof statistics.combined !== "object" || Array.isArray(statistics.combined)) {
      throw new Error(`statistics.combined missing: ${tournament.name}`);
    }
    return [tournament.name, statistics.combined];
  }));
  const injectedData = `<script>window.tournamentStatistics = Object.assign(window.tournamentStatistics ?? {}, ${serializeForInlineScript(statisticsByName)});window.gModalHistory = ${serializeForInlineScript(modalHistory)};</script>`;
  const visibleTournaments = tournaments.filter(tournament => tournament?.name);
  const tablesHtml = visibleTournaments
    .map(tournament => renderTournamentSection(
      tournament,
      statisticsByName,
      timeDistributionByName,
      scheduleSessionsByName,
      isArchive
    ))
    .join("");
  const scheduleHtml = isArchive ? "" : renderScheduleSection(scheduleMap, combinedStatsByName);

  return `${tablesHtml} ${scheduleHtml} ${injectedData}`;
}

export function renderArchiveContentFragment(statisticsByName, timeDistributionByName, tournaments, modalHistory) {
  return renderContentFragment(statisticsByName, timeDistributionByName, {}, tournaments, true, null, modalHistory);
}
