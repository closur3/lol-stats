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

export function renderContentFragment(globalStats, timeGridBySlug, scheduleMap, tournaments, isArchive = false, scheduleMetaBySlug, h2hMatches = null) {
  assertObject(globalStats, "globalStats");
  assertObject(timeGridBySlug, "timeGridBySlug");
  assertObject(scheduleMap, "scheduleMap");
  assertTournaments(tournaments);
  if (!isArchive) {
    assertObject(scheduleMetaBySlug, "scheduleMetaBySlug");
    if (!Array.isArray(h2hMatches)) throw new Error("h2hMatches must be an array");
  }

  const h2hInjection = isArchive ? "" : `window.gH2HMatches = ${serializeForInlineScript(h2hMatches)};`;
  const injectedData = `<script>window.gStats = Object.assign(window.gStats ?? {}, ${serializeForInlineScript(globalStats)});${h2hInjection}</script>`;
  const tablesHtml = tournaments
    .filter(tournament => tournament?.slug)
    .map(tournament => renderTournamentSection(tournament, globalStats, timeGridBySlug, scheduleMetaBySlug, isArchive))
    .join("");
  const scheduleHtml = isArchive ? "" : renderScheduleSection(scheduleMap, globalStats);

  return `${tablesHtml} ${scheduleHtml} ${injectedData}`;
}

export function renderArchiveContentFragment(globalStats, timeGridBySlug, tournaments) {
  return renderContentFragment(globalStats, timeGridBySlug, {}, tournaments, true, null, null);
}
