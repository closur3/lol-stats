import { renderLeagueSection } from './content/leagueSection.js';
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

export function renderContentOnly(globalStats, timeData, scheduleMap, tournaments, isArchive = false, scheduleMetaBySlug) {
  assertObject(globalStats, "globalStats");
  assertObject(timeData, "timeData");
  assertObject(scheduleMap, "scheduleMap");
  assertTournaments(tournaments);
  if (!isArchive) assertObject(scheduleMetaBySlug, "scheduleMetaBySlug");

  const injectedData = `<script>window.g_stats = Object.assign(window.g_stats ?? {}, ${JSON.stringify(globalStats)});</script>`;
  const tablesHtml = tournaments
    .filter(tournament => tournament?.slug)
    .map(tournament => renderLeagueSection(tournament, globalStats, timeData, scheduleMetaBySlug, isArchive))
    .join("");
  const scheduleHtml = isArchive ? "" : renderScheduleSection(scheduleMap, globalStats);

  return `${tablesHtml} ${scheduleHtml} ${injectedData}`;
}

export function renderArchiveContentOnly(globalStats, timeData, tournaments) {
  return renderContentOnly(globalStats, timeData, {}, tournaments, true, null);
}
