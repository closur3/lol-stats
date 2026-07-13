import { renderArchiveContentFragment, renderContentFragment } from './templates/content.js';
import { renderPageShell } from './templates/page.js';
import { readTournamentConfig } from '../core/facts/tournamentConfigReader.js';
import { readActiveHomes } from '../core/updater/activeHomeReader.js';
import { readArchiveSnapshots } from '../core/updater/archiveSnapshotReader.js';
import { readScheduleMetaBySlug, buildHomeRenderInput, pruneHomeSchedule } from '../core/updater/homeRenderInputBuilder.js';
import { readHasActiveCron } from '../core/scheduler/activeCronStatus.js';

export async function renderHomeFromFacts(env) {
  const { active: tournaments } = await readTournamentConfig(env);
  const activeHomes = await readActiveHomes(env, tournaments.map(tournament => tournament.slug));

  const orderedTournaments = activeHomes.map(activeHome => activeHome.tournament);
  const scheduleMetaBySlug = await readScheduleMetaBySlug(env, orderedTournaments);
  const renderInput = buildHomeRenderInput(activeHomes, orderedTournaments, scheduleMetaBySlug);
  const limitedScheduleMap = pruneHomeSchedule(renderInput.scheduleMap, renderInput.scheduleMetaBySlug);

  const homeFragment = renderContentFragment(
    renderInput.globalStats,
    renderInput.timeGrid,
    limitedScheduleMap,
    renderInput.tournaments,
    false,
    renderInput.scheduleMetaBySlug
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

  const combined = archiveSnapshots.map(snapshot => {
    const snapshotTournament = snapshot.tournament;
    const miniTournaments = [snapshotTournament];
    const content = renderArchiveContentFragment(
      { [snapshotTournament.slug]: snapshot.stats },
      { [snapshotTournament.slug]: snapshot.timeGrid },
      miniTournaments
    );
    return content;
  }).join("");

  const hasActiveCron = await readHasActiveCron(env);
  return renderPageShell("Archive", `<div class="arch-content">${combined}</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
}
