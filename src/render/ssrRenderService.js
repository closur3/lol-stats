import { renderArchiveContentFragment, renderContentFragment } from './templates/content.js';
import { renderPageShell } from './templates/page.js';
import { readActiveConfig } from '../core/updater/activeConfigReader.js';
import { readHomeEntries } from '../core/updater/homeSnapshotReader.js';
import { readArchiveConfig } from '../core/updater/archiveConfigReader.js';
import { restoreMissingScheduleMetaBySlugFromRawMatches, buildHomeRenderInput, pruneHomeSchedule } from '../core/updater/homeRenderInputBuilder.js';
import { kvKeys } from '../infrastructure/kv/keyFactory.js';
import { readHasActiveCron } from '../core/scheduler/activeCronStatus.js';

export async function renderHomeFromFacts(env) {
  const tournaments = await readActiveConfig(env);
  const homeEntries = await readHomeEntries(env, tournaments.map(tournament => tournament.slug));

  if (homeEntries.length === 0) {
    const hasActiveCron = await readHasActiveCron(env);
    return renderPageShell("LoL Stats", `<div class="arch-content arch-empty-msg">No active data available</div>`, "home", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
  }

  const orderedTournaments = homeEntries.map(home => home.tournament);
  const scheduleMetaBySlug = await restoreMissingScheduleMetaBySlugFromRawMatches(env, orderedTournaments);
  const renderInput = buildHomeRenderInput(homeEntries, orderedTournaments, scheduleMetaBySlug);
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
  const kv = env["lol-stats-kv"];
  const tournaments = await readArchiveConfig(env);

  if (!tournaments.length) {
    const hasActiveCron = await readHasActiveCron(env);
    return renderPageShell("Archive", `<div class="arch-content arch-empty-msg">No archive data available</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron);
  }

  const slugs = tournaments.map(tournament => tournament.slug);
  const archiveSnapshots = await Promise.all(slugs.map(slug => kv.get(kvKeys.archive(slug), { type: "json" })));
  const snapshotErrors = [];
  const validSnapshots = archiveSnapshots.map((snapshot, index) => {
    const slug = slugs[index];
    const snapshotTournament = snapshot?.tournament;
    if (!snapshot || !snapshotTournament || !snapshotTournament.slug) {
      snapshotErrors.push({ slug, reason: "Missing snapshot" });
      return null;
    }
    if (Object.hasOwn(snapshot, "teamMap") || Object.hasOwn(snapshotTournament, "teamMap")) {
      snapshotErrors.push({ slug, reason: "Legacy team map" });
      return null;
    }
    if (!snapshot.stats || typeof snapshot.stats !== "object" || Array.isArray(snapshot.stats)) {
      snapshotErrors.push({ slug, reason: "Invalid stats" });
      return null;
    }
    if (!snapshot.timeGrid || typeof snapshot.timeGrid !== "object" || Array.isArray(snapshot.timeGrid)) {
      snapshotErrors.push({ slug, reason: "Invalid time grid" });
      return null;
    }
    return snapshot;
  });
  if (snapshotErrors.length > 0) {
    const error = new Error(`${snapshotErrors.length} archive snapshots unavailable`);
    error.issues = snapshotErrors;
    throw error;
  }

  const combined = validSnapshots.map(snapshot => {
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
