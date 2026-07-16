import { renderArchiveContentFragment, renderContentFragment } from './templates/content.js';
import { renderPageShell } from './templates/page.js';
import { readTournamentConfig } from '../core/facts/tournamentConfigReader.js';
import { readActiveHomes } from '../core/updater/activeHomeReader.js';
import { readArchiveSnapshots } from '../core/updater/archiveSnapshotReader.js';
import { readScheduleMetaBySlug, buildHomeRenderInput, pruneHomeSchedule } from '../core/updater/homeRenderInputBuilder.js';
import { readHasActiveCron } from '../core/scheduler/activeCronStatus.js';
import { inspectH2HArtifacts } from './h2hMatchesBuilder.js';
import { validateTimeGrid } from './components/timeTable.js';
import { throwIfArtifactsUnavailable } from '../core/updater/artifactAvailability.js';
import { readSchemaIssue } from '../core/facts/schemaIssue.js';

function collectTimeGridIssues(activeHomes, archiveSnapshots) {
  const issues = [];
  const inspectArtifact = (artifact, artifactType) => {
    const slug = artifact?.tournament?.slug || "unknown";
    const artifactKey = `${artifactType}_${slug}`;
    try {
      validateTimeGrid(artifact?.timeGrid, artifactKey);
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
  const [activeHomes, archiveSnapshots] = await Promise.all([
    readActiveHomes(env, tournaments.map(tournament => tournament.slug)),
    readArchiveSnapshots(env, archiveTournaments.map(tournament => tournament.slug))
  ]);

  const orderedTournaments = activeHomes.map(activeHome => activeHome.tournament);
  const scheduleMetaBySlug = await readScheduleMetaBySlug(env, orderedTournaments);
  const renderInput = buildHomeRenderInput(activeHomes, orderedTournaments, scheduleMetaBySlug);
  const limitedScheduleMap = pruneHomeSchedule(renderInput.scheduleMap, renderInput.scheduleMetaBySlug);
  const h2hInspection = inspectH2HArtifacts(activeHomes, archiveSnapshots);
  const artifactIssues = [
    ...h2hInspection.issues,
    ...collectTimeGridIssues(activeHomes, archiveSnapshots)
  ];
  throwIfArtifactsUnavailable("tournament artifacts", artifactIssues);
  const h2hMatches = h2hInspection.matches;

  const homeFragment = renderContentFragment(
    renderInput.globalStats,
    renderInput.timeGrid,
    limitedScheduleMap,
    renderInput.tournaments,
    false,
    renderInput.scheduleMetaBySlug,
    h2hMatches
  );

  const hasActiveCron = await readHasActiveCron(env);
  return renderPageShell("LoL Stats", homeFragment, "home", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
}

export async function renderArchiveFromFacts(env) {
  const { archive: tournaments } = await readTournamentConfig(env);

  if (!tournaments.length) {
    const hasActiveCron = await readHasActiveCron(env);
    return renderPageShell("Archive", `<div class="arch-content arch-empty-msg">No archive data available</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
  }

  const slugs = tournaments.map(tournament => tournament.slug);
  const archiveSnapshots = await readArchiveSnapshots(env, slugs);
  const archiveIssues = collectTimeGridIssues([], archiveSnapshots);
  throwIfArtifactsUnavailable("archive snapshots", archiveIssues);

  const globalStats = {};
  const timeGridBySlug = {};
  for (const snapshot of archiveSnapshots) {
    const snapshotTournament = snapshot.tournament;
    globalStats[snapshotTournament.slug] = snapshot.stats;
    timeGridBySlug[snapshotTournament.slug] = snapshot.timeGrid;
  }
  const combined = renderArchiveContentFragment(globalStats, timeGridBySlug, tournaments);

  const hasActiveCron = await readHasActiveCron(env);
  return renderPageShell("Archive", `<div class="arch-content">${combined}</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
}
