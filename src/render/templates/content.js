import { renderTournamentSection } from './content/tournamentSection.js';
import { renderScheduleSection } from './content/scheduleSection.js';

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

export function renderContentFragment(globalStats, timeGridBySlug, scheduleMap, tournaments, isArchive = false, scheduleMetaBySlug) {
  assertObject(globalStats, "globalStats");
  assertObject(timeGridBySlug, "timeGridBySlug");
  assertObject(scheduleMap, "scheduleMap");
  assertTournaments(tournaments);
  if (!isArchive) assertObject(scheduleMetaBySlug, "scheduleMetaBySlug");

  const injectedData = `<script>window.gStats = Object.assign(window.gStats ?? {}, ${JSON.stringify(globalStats)});</script>`;
  const tablesHtml = tournaments
    .filter(tournament => tournament?.slug)
    .map(tournament => renderTournamentSection(tournament, globalStats, timeGridBySlug, scheduleMetaBySlug, isArchive))
    .join("");
  const scheduleHtml = isArchive ? "" : renderScheduleSection(scheduleMap, globalStats);

  return `${tablesHtml} ${scheduleHtml} ${injectedData}`;
}

export function renderArchiveContentFragment(globalStats, timeGridBySlug, tournaments) {
  return renderContentFragment(globalStats, timeGridBySlug, {}, tournaments, true, null);
}
