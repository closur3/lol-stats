import { renderLeagueSection } from './content/leagueSection.js';
import { renderScheduleSection } from './content/scheduleSection.js';

export function renderContentOnly(globalStats, timeData, scheduleMap, runtimeConfig, isArchive = false, tournamentMeta = {}) {
  globalStats = globalStats ?? {};
  timeData = timeData ?? {};
  scheduleMap = scheduleMap ?? {};

  const injectedData = `<script>window.g_stats = Object.assign(window.g_stats ?? {}, ${JSON.stringify(globalStats)});</script>`;
  const tablesHtml = runtimeConfig.TOURNAMENTS
    .filter(tournament => tournament?.slug)
    .map(tournament => renderLeagueSection(tournament, globalStats, timeData, tournamentMeta, isArchive))
    .join("");
  const scheduleHtml = isArchive ? "" : renderScheduleSection(scheduleMap, globalStats);

  return `${tablesHtml} ${scheduleHtml} ${injectedData}`;
}
