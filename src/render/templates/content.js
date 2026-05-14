import { renderLeagueSection } from './content/leagueSection.js';
import { renderScheduleSection } from './content/scheduleSection.js';

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
}

export function renderContentOnly(globalStats, timeData, scheduleMap, runtimeConfig, isArchive = false, tournamentMeta = {}) {
  assertObject(globalStats, "globalStats");
  assertObject(timeData, "timeData");
  assertObject(scheduleMap, "scheduleMap");
  assertObject(tournamentMeta, "tournamentMeta");

  const injectedData = `<script>window.g_stats = Object.assign(window.g_stats ?? {}, ${JSON.stringify(globalStats)});</script>`;
  const tablesHtml = runtimeConfig.TOURNAMENTS
    .filter(tournament => tournament?.slug)
    .map(tournament => renderLeagueSection(tournament, globalStats, timeData, tournamentMeta, isArchive))
    .join("");
  const scheduleHtml = isArchive ? "" : renderScheduleSection(scheduleMap, globalStats);

  return `${tablesHtml} ${scheduleHtml} ${injectedData}`;
}
