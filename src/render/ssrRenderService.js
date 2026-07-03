import { HTMLRenderer } from './htmlRenderer.js';
import { dateUtils } from '../utils/dateUtils.js';
import { loadTourConfig } from '../core/updater/tourConfigLoader.js';
import { readHomeEntries } from '../core/updater/homeSnapshotReader.js';
import { readArchiveIndex } from '../core/updater/archiveIndex.js';
import { loadScheduleMetaBySlug, buildStaticRenderInput, pruneStaticSchedule } from '../core/updater/staticRenderInput.js';
import { kvKeys } from '../infrastructure/kv/keyFactory.js';
import { IDLE_SWEEP_CRON } from '../core/scheduler/cronBuckets.js';

async function hasActiveCron(env) {
  const kv = env["lol-stats-kv"];
  const state = await kv.get(kvKeys.scheduleDay(), { type: "json" });
  if (!state || !Array.isArray(state.schedules)) return false;
  return state.schedules.some(cron => cron !== IDLE_SWEEP_CRON);
}

export async function renderHomeFromFacts(env) {
  const tournaments = await loadTourConfig(env);
  const homeEntries = await readHomeEntries(env, tournaments.map(t => t.slug));

  if (homeEntries.length === 0) {
    const activeCron = await hasActiveCron(env);
    return HTMLRenderer.renderPageShell("LoL Stats", `<div class="arch-content arch-empty-msg">No active data available</div>`, "home", env.GITHUB_TIME, env.GITHUB_SHA, activeCron);
  }

  const sortedTournaments = dateUtils.sortTournamentsByDate(homeEntries.map(home => home.tournament));
  const scheduleMetaBySlug = await loadScheduleMetaBySlug(env, sortedTournaments);
  const renderInput = buildStaticRenderInput(homeEntries, sortedTournaments, scheduleMetaBySlug);
  const limitedScheduleMap = pruneStaticSchedule(renderInput.scheduleMap, renderInput.tournamentMeta);

  const homeFragment = HTMLRenderer.renderContentOnly(
    renderInput.globalStats,
    renderInput.timeGrid,
    limitedScheduleMap,
    renderInput.tournaments,
    false,
    renderInput.tournamentMeta
  );

  const activeCron = await hasActiveCron(env);
  return HTMLRenderer.renderPageShell("LoL Stats", homeFragment, "home", env.GITHUB_TIME, env.GITHUB_SHA, activeCron);
}

export async function renderArchiveFromFacts(env) {
  const kv = env["lol-stats-kv"];
  const tournaments = await readArchiveIndex(env);

  if (!tournaments.length) {
    const activeCron = await hasActiveCron(env);
    return HTMLRenderer.renderPageShell("Archive", `<div class="arch-content arch-empty-msg">No archive data available</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, activeCron);
  }

  const slugs = tournaments.map(t => t.slug);
  const rawSnapshots = await Promise.all(slugs.map(slug => kv.get(kvKeys.archive(slug), { type: "json" })));
  let validSnapshots = rawSnapshots.map((snapshot, index) => {
    const slug = slugs[index];
    const snapshotTournament = snapshot?.tournament;
    if (!snapshot || !snapshotTournament || !snapshotTournament.slug) {
      throw new Error(`Invalid archive snapshot: ${slug}`);
    }
    if (!Array.isArray(snapshot.rawMatches)) {
      throw new Error(`Invalid archive rawMatches: ${slug}`);
    }
    if (!snapshot.stats || typeof snapshot.stats !== "object" || Array.isArray(snapshot.stats)) {
      throw new Error(`Invalid archive stats: ${slug}`);
    }
    if (!snapshot.timeGrid || typeof snapshot.timeGrid !== "object" || Array.isArray(snapshot.timeGrid)) {
      throw new Error(`Invalid archive timeGrid: ${slug}`);
    }
    if (!snapshot.teamMap || typeof snapshot.teamMap !== "object" || Array.isArray(snapshot.teamMap)) {
      throw new Error(`Invalid archive teamMap: ${slug}`);
    }
    return snapshot;
  });

  validSnapshots = dateUtils
    .sortTournamentsByDate(validSnapshots.map(snapshot => {
      const snapshotTournament = snapshot.tournament;
      return { ...snapshotTournament, __snapshot: snapshot };
    }))
    .map(tournament => tournament.__snapshot);

  const combined = validSnapshots.map(snap => {
    const snapshotTournament = snap.tournament;
    const miniTournaments = [{ ...snapshotTournament, teamMap: snap.teamMap }];
    const content = HTMLRenderer.renderArchiveContentOnly(
      { [snapshotTournament.slug]: snap.stats },
      { [snapshotTournament.slug]: snap.timeGrid },
      miniTournaments
    );
    return content;
  }).join("");

  const activeCron = await hasActiveCron(env);
  return HTMLRenderer.renderPageShell("Archive", `<div class="arch-content">${combined}</div>`, "archive", env.GITHUB_TIME, env.GITHUB_SHA, activeCron);
}
