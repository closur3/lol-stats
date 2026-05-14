import { HTMLRenderer } from '../../render/htmlRenderer.js';
import { dateUtils } from '../../utils/dateUtils.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { kvPutIfChanged } from '../../utils/kvStore.js';
import { generateArchiveStaticHTML } from './archiveBuilder.js';
import { readHomeEntries } from './homeSnapshotReader.js';
import { buildStaticRenderInput, loadScheduleMetaBySlug, pruneStaticSchedule } from './staticRenderInput.js';

export async function refreshHomeStaticFromCache(env) {
  return rebuildStaticPagesFromCache(env, { includeArchive: false, requireData: false });
}

function normalizeStaticRebuildOptions(options) {
  return {
    includeArchive: options.includeArchive !== false,
    requireData: options.requireData !== false
  };
}

async function writeEmptyStaticPages(env, includeArchive, requireData) {
  const writePromises = [];
  let homeChanged = false;
  let archiveChanged = false;

  if (includeArchive) {
    const archiveHTML = await generateArchiveStaticHTML(env);
    writePromises.push(kvPutIfChanged(env, kvKeys.archiveStatic(), archiveHTML));
    archiveChanged = true;
  }
  if (writePromises.length === 0 && requireData) {
    return { ok: false, reason: "NO_CACHE", message: "No HOME cache data available. Run Force Update first." };
  }
  await Promise.all(writePromises);
  return { ok: true, homes: 0, writes: writePromises.length, homeChanged, archiveChanged };
}

async function writeStaticPages(env, homeEntries, renderInput, includeArchive) {
  const kv = env["lol-stats-kv"];
  const writePromises = [];
  let homeChanged = false;
  let archiveChanged = false;

  const limitedScheduleMap = pruneStaticSchedule(renderInput.scheduleMap, renderInput.tournamentMeta);

  const homeFragment = HTMLRenderer.renderContentOnly(
    renderInput.globalStats,
    renderInput.timeGrid,
    limitedScheduleMap,
    renderInput.runtimeConfig,
    false,
    renderInput.tournamentMeta
  );
  const fullPage = HTMLRenderer.renderPageShell("LoL Stats", homeFragment, "home", env.GITHUB_TIME, env.GITHUB_SHA);
  if (await kv.get(kvKeys.homeStatic()) !== fullPage) {
    writePromises.push(kvPutIfChanged(env, kvKeys.homeStatic(), fullPage));
    homeChanged = true;
  }

  if (includeArchive) {
    const archiveHTML = await generateArchiveStaticHTML(env);
    writePromises.push(kvPutIfChanged(env, kvKeys.archiveStatic(), archiveHTML));
    archiveChanged = true;
  }

  await Promise.all(writePromises);
  return {
    ok: true,
    homes: homeEntries.length,
    writes: writePromises.length,
    homeChanged,
    archiveChanged
  };
}

export async function rebuildStaticPagesFromCache(env, options = {}) {
  const { includeArchive, requireData } = normalizeStaticRebuildOptions(options);
  const homeEntries = await readHomeEntries(env);

  if (homeEntries.length === 0) {
    return writeEmptyStaticPages(env, includeArchive, requireData);
  }

  const sortedTournaments = dateUtils.sortTournamentsByDate(homeEntries.map(home => home.tournament));
  const scheduleMetaBySlug = await loadScheduleMetaBySlug(env, sortedTournaments);
  const renderInput = buildStaticRenderInput(homeEntries, sortedTournaments, scheduleMetaBySlug);

  if (requireData && Object.keys(renderInput.globalStats).length === 0) {
    return { ok: false, reason: "NO_CACHE", message: "No HOME stats cache data available. Run Force Update first." };
  }

  return writeStaticPages(env, homeEntries, renderInput, includeArchive);
}
