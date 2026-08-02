import { renderArchiveContentFragment, renderContentFragment } from './templates/content.js';
import { renderPageShell } from './templates/page.js';
import { readTournamentConfig } from '../core/facts/tournamentConfigReader.js';
import { readActiveHomes, readAvailableActiveHomes } from '../core/updater/activeHomeReader.js';
import { readAvailableArchiveSnapshots } from '../core/updater/archiveSnapshotReader.js';
import { buildHomeRenderInput, readHomeScheduleFacts } from '../core/updater/homeRenderInputBuilder.js';
import { readHasActiveCron } from '../core/scheduler/activeCronStatus.js';
import { inspectModalHistory } from './modalHistoryBuilder.js';
import { validateTimeGrid } from './components/timeTable.js';
import { throwIfArtifactsUnavailable } from '../core/updater/artifactAvailability.js';
import { readSchemaIssue } from '../core/facts/schemaIssue.js';
import { selectHomeSchedule } from '../core/projection/homeScheduleSelector.js';
import { updateConfig } from '../core/updater/updateConfig.js';
import { readTimeGridCollectionIssue } from '../core/facts/timeGridCollection.js';

function collectTimeGridIssues(activeHomes, archiveSnapshots, tournaments) {
  const issues = [];
  const tournamentsBySlug = new Map(tournaments.map(tournament => [tournament.slug, tournament]));
  const inspectArtifact = (artifact, artifactType) => {
    const slug = artifact?.tournamentSlug || "unknown";
    const artifactKey = `${artifactType}_${slug}`;
    const tournament = tournamentsBySlug.get(slug);
    if (!tournament) throw new Error(`TournamentConfig missing artifact owner: ${artifactKey}`);
    const collectionIssue = readTimeGridCollectionIssue(artifact?.timeGrid, tournament, artifactKey);
    if (collectionIssue) {
      issues.push(collectionIssue);
      return;
    }
    try {
      validateTimeGrid(artifact.timeGrid.combined, artifactKey);
      artifact.timeGrid.pages.forEach(page => validateTimeGrid(page.timeGrid, artifactKey));
    } catch (error) {
      const issue = readSchemaIssue(error);
      if (issue.artifactKey !== artifactKey) {
        throw new Error(`Time Grid artifact identity mismatch: ${artifactKey}`, { cause: error });
      }
      issues.push(issue);
    }
  };
  activeHomes.forEach(artifact => inspectArtifact(artifact, "ActiveHome"));
  archiveSnapshots.forEach(artifact => inspectArtifact(artifact, "ArchiveSnapshot"));
  return issues;
}

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
  const { scheduleSessionsMap, scheduleState } = await readHomeScheduleFacts(env, orderedTournaments);
  const renderInput = buildHomeRenderInput(activeHomes, orderedTournaments);
  const scheduleMap = selectHomeSchedule(
    scheduleSessionsMap,
    scheduleState,
    orderedTournaments,
    new Date(),
    updateConfig.maxScheduleDays
  );
  const scheduleSessionsBySlug = Object.fromEntries(Array.from(scheduleSessionsMap, ([slug, value]) => [slug, { sessions: value.sessions }]));
  const modalInspection = inspectModalHistory(activeHomes, archiveSnapshots, [...tournaments, ...archiveTournaments], tournaments, scheduleSessionsMap);
  const artifactIssues = [
    ...modalInspection.issues,
    ...collectTimeGridIssues(activeHomes, archiveSnapshots, [...tournaments, ...archiveTournaments])
  ];
  throwIfArtifactsUnavailable("tournament artifacts", artifactIssues);
  const modalHistory = modalInspection.history;

  const homeFragment = renderContentFragment(
    renderInput.statisticsBySlug,
    renderInput.timeGrid,
    scheduleMap,
    renderInput.tournaments,
    false,
    scheduleSessionsBySlug,
    modalHistory
  );

  const hasActiveCron = await readHasActiveCron(env);
  return renderPageShell("LoL Stats", homeFragment, "home", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
}

export async function renderArchiveFromFacts(env) {
  const { active: activeTournaments, archive: tournaments } = await readTournamentConfig(env);

  if (!tournaments.length) {
    const hasActiveCron = await readHasActiveCron(env);
    return renderPageShell("Archive", `<div class="arch-content arch-empty-msg">No archive data available</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
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
    const hasActiveCron = await readHasActiveCron(env);
    return renderPageShell("Archive", `<div class="arch-content arch-empty-msg">Archive data unavailable. Rebuild it in Tools.</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
  }
  const availableSlugs = new Set(archiveSnapshots.map(snapshot => snapshot.tournamentSlug));
  const availableTournaments = tournaments.filter(tournament => availableSlugs.has(tournament.slug));
  const modalInspection = inspectModalHistory(activeResult.activeHomes, archiveSnapshots, [...activeTournaments, ...tournaments], [], new Map());
  const archiveIssues = [
    ...collectTimeGridIssues([], archiveSnapshots, tournaments),
    ...modalInspection.issues
  ];
  throwIfArtifactsUnavailable("archive snapshots", archiveIssues);

  const statisticsBySlug = {};
  const timeGridBySlug = {};
  for (const snapshot of archiveSnapshots) {
    statisticsBySlug[snapshot.tournamentSlug] = snapshot.statistics;
    timeGridBySlug[snapshot.tournamentSlug] = snapshot.timeGrid;
  }
  const combined = renderArchiveContentFragment(statisticsBySlug, timeGridBySlug, availableTournaments, modalInspection.history);

  const hasActiveCron = await readHasActiveCron(env);
  return renderPageShell("Archive", `<div class="arch-content">${combined}</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
}
