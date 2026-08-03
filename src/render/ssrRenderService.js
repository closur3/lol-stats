import { renderArchiveContentFragment, renderContentFragment } from './templates/content.js';
import { renderPageShell } from './templates/page.js';
import { readTournamentConfig } from '../core/facts/tournamentConfigReader.js';
import { readActiveHomes, readAvailableActiveHomes } from '../core/updater/activeHomeReader.js';
import { readAvailableArchiveSnapshots } from '../core/updater/archiveSnapshotReader.js';
import { buildHomeRenderInput, readScheduleSessionsMap } from '../core/updater/homeRenderInputBuilder.js';
import { readCronInfo } from '../core/scheduler/cronInfo.js';
import { buildModalHistory } from './modalHistoryBuilder.js';
import { throwIfArtifactsUnavailable } from '../core/updater/artifactAvailability.js';
import { selectHomeSchedule } from '../core/projection/homeScheduleSelector.js';
import { updateConfig } from '../core/updater/updateConfig.js';

export async function renderHomeFromFacts(env) {
  const { active: tournaments, archive: archiveTournaments } = await readTournamentConfig(env);
  const [activeHomes, archiveResult] = await Promise.all([
    readActiveHomes(env, tournaments),
    readAvailableArchiveSnapshots(env, archiveTournaments)
  ]);
  const archiveSnapshots = archiveResult.snapshots;
  if (archiveResult.issues.length > 0) {
    console.error(`[HOME:ARCHIVE] unavailable=${archiveResult.issues.map(issue => issue.artifactKey).join(",")}`);
  }

  const orderedTournaments = tournaments;
  const scheduleSessionsMap = await readScheduleSessionsMap(env, orderedTournaments);
  const renderInput = buildHomeRenderInput(activeHomes, orderedTournaments);
  const scheduleMap = selectHomeSchedule(
    scheduleSessionsMap,
    orderedTournaments,
    new Date(),
    updateConfig.maxScheduleDays
  );
  const scheduleSessionsBySlug = Object.fromEntries(Array.from(scheduleSessionsMap, ([slug, value]) => [slug, { sessions: value.sessions }]));
  const modalHistory = buildModalHistory(activeHomes, archiveSnapshots, [...tournaments, ...archiveTournaments], tournaments, scheduleSessionsMap);

  const homeFragment = renderContentFragment(
    renderInput.statisticsBySlug,
    renderInput.timeDistributionBySlug,
    scheduleMap,
    renderInput.tournaments,
    false,
    scheduleSessionsBySlug,
    modalHistory
  );

  const cronInfo = await readCronInfo(env);
  return renderPageShell("LoL Stats", homeFragment, "home", env.GITHUB_TIME, env.GITHUB_SHA, cronInfo);
}

export async function renderArchiveFromFacts(env) {
  const { active: activeTournaments, archive: tournaments } = await readTournamentConfig(env);

  if (!tournaments.length) {
    const cronInfo = await readCronInfo(env);
    return renderPageShell("Archive", `<div class="arch-content arch-empty-msg">No archive data available</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, cronInfo);
  }

  const [archiveResult, activeResult] = await Promise.all([
    readAvailableArchiveSnapshots(env, tournaments),
    readAvailableActiveHomes(env, activeTournaments)
  ]);
  const archiveSnapshots = archiveResult.snapshots;
  const unavailable = [...archiveResult.issues, ...activeResult.issues];
  if (unavailable.length > 0) {
    console.error(`[ARCHIVE:READ] unavailable=${unavailable.map(issue => issue.artifactKey).join(",")}`);
  }
  if (archiveSnapshots.length === 0) {
    throwIfArtifactsUnavailable("ArchiveSnapshot", archiveResult.issues);
    throw new Error("ArchiveSnapshot unavailable without schema issues");
  }
  const availableSlugs = new Set(archiveSnapshots.map(snapshot => snapshot.tournamentSlug));
  const availableTournaments = tournaments.filter(tournament => availableSlugs.has(tournament.slug));
  const modalHistory = buildModalHistory(activeResult.activeHomes, archiveSnapshots, [...activeTournaments, ...tournaments], [], new Map());

  const statisticsBySlug = {};
  const timeDistributionBySlug = {};
  for (const snapshot of archiveSnapshots) {
    statisticsBySlug[snapshot.tournamentSlug] = snapshot.statistics;
    timeDistributionBySlug[snapshot.tournamentSlug] = snapshot.timeDistribution;
  }
  const combined = renderArchiveContentFragment(statisticsBySlug, timeDistributionBySlug, availableTournaments, modalHistory);

  const cronInfo = await readCronInfo(env);
  return renderPageShell("Archive", `<div class="arch-content">${combined}</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, cronInfo);
}
