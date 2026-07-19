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

export function renderContentFragment(globalStats, timeGridBySlug, scheduleMap, tournaments, isArchive = false, scheduleSessionsBySlug, modalHistory) {
  assertObject(globalStats, "globalStats");
  assertObject(timeGridBySlug, "timeGridBySlug");
  assertObject(scheduleMap, "scheduleMap");
  assertTournaments(tournaments);
  if (!Array.isArray(modalHistory)) throw new Error("modalHistory must be an array");
  if (!isArchive) {
    assertObject(scheduleSessionsBySlug, "scheduleSessionsBySlug");
  }

  const injectedData = `<script>window.gStats = Object.assign(window.gStats ?? {}, ${serializeForInlineScript(globalStats)});window.gModalHistory = ${serializeForInlineScript(modalHistory)};</script>`;
  const tablesHtml = tournaments
    .filter(tournament => tournament?.slug)
    .map(tournament => renderTournamentSection(tournament, globalStats, timeGridBySlug, scheduleSessionsBySlug, isArchive))
    .join("");
  const scheduleHtml = isArchive ? "" : renderScheduleSection(scheduleMap, globalStats);

  return `${tablesHtml} ${scheduleHtml} ${injectedData}`;
}

export function renderArchiveContentFragment(globalStats, timeGridBySlug, tournaments, modalHistory) {
  return renderContentFragment(globalStats, timeGridBySlug, {}, tournaments, true, null, modalHistory);
}
