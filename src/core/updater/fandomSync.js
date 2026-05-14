import { FandomClient } from '../../api/fandomClient.js';
import { Analyzer } from '../analyzer.js';
import { determineCandidates } from './candidates.js';
import { fetchMatchData } from './fetchData.js';
import { prepareTournamentContext } from './context.js';
import { processResults } from './dataProcessor.js';
import { generateLog, buildLeagueLogEntries } from './logWriter.js';
import { buildWriteScopeSlugs, writeHomeProjections } from '../projection/homeProjector.js';
import { writeTournamentFacts } from './factWriter.js';
import { appendLeagueLogs } from './logPersistence.js';
import { commitRevisionWrites } from './revWriter.js';
import { UPDATE_CONFIG } from './types.js';
import { loadTeamsConfig } from './teamsConfigLoader.js';
import { refreshHomeStaticFromCache } from './cacheRebuilder.js';

function buildScopedRuntimeConfig(runtimeConfig, scopeSlugs) {
  return {
    ...runtimeConfig,
    TOURNAMENTS: (runtimeConfig.TOURNAMENTS || []).filter(tournament => scopeSlugs.has(tournament.slug))
  };
}

function buildScopedRawMatches(rawMatches, scopeSlugs) {
  return Object.fromEntries([...scopeSlugs].map(slug => {
    const matches = rawMatches[slug];
    if (!Array.isArray(matches)) throw new Error(`RAW_MATCHES missing in analysis scope: ${slug}`);
    return [slug, matches];
  }));
}

function buildFandomOptions(force, options) {
  return {
    forceWrite: options.forceWrite === undefined ? force : !!options.forceWrite,
    revidChanges: options.revidChanges || {},
    pendingRevisionWrites: options.pendingRevisionWrites || {}
  };
}

async function createFandomClient(env) {
  const authContext = await FandomClient.login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
  return {
    authContext,
    fandomClient: new FandomClient(authContext)
  };
}

async function fetchAndProcessFandom(env, runtimeConfig, cache, force, forceSlugs) {
  const candidates = determineCandidates(runtimeConfig.TOURNAMENTS, forceSlugs);
  if (candidates.length === 0) {
    console.log(`[UPDATE:SKIP] all tournaments skipped`);
    return null;
  }

  const { authContext, fandomClient } = await createFandomClient(env);
  const results = await fetchMatchData(fandomClient, candidates);
  const processed = processResults(results, cache, force, forceSlugs, runtimeConfig);
  const { failedSlugs, syncItems, skipItems, breakers, apiErrors } = processed;
  console.log(`[FANDOM:PROCESS] sync=${syncItems.length} skip=${skipItems.length} breakers=${breakers.length} apiErrors=${apiErrors.length} failed=${failedSlugs.size}`);
  return { authContext, ...processed };
}

function attachRevisionChanges(items, revidChanges) {
  for (const item of items) {
    if (revidChanges[item.slug]) {
      item.revidChanges = revidChanges[item.slug];
    }
  }
}

function buildLogs(runtimeConfig, processed, authContext, logger) {
  const { syncItems, skipItems, breakers, apiErrors, displayNameMap } = processed;
  generateLog(syncItems, skipItems, breakers, apiErrors, authContext, logger);
  return buildLeagueLogEntries(syncItems, skipItems, breakers, apiErrors, authContext, runtimeConfig, displayNameMap);
}

async function persistWriteScope(env, runtimeConfig, cache, teamsRaw, writeScopeSlugs) {
  if (writeScopeSlugs.size === 0) return;
  const scopedRuntimeConfig = buildScopedRuntimeConfig(runtimeConfig, writeScopeSlugs);
  await prepareTournamentContext(env, scopedRuntimeConfig, cache, teamsRaw);
  const scopedRawMatches = buildScopedRawMatches(cache.rawMatches, writeScopeSlugs);
  const analysis = Analyzer.runFullAnalysis(scopedRawMatches, scopedRuntimeConfig, UPDATE_CONFIG.MAX_SCHEDULE_DAYS);
  await writeTournamentFacts(env, scopedRuntimeConfig, cache, analysis, writeScopeSlugs);
  await writeHomeProjections(env, scopedRuntimeConfig, cache, analysis, writeScopeSlugs);
  await refreshHomeStaticFromCache(env);
}

export async function runFandomUpdate(env, githubClient, runtimeConfig, cache, force = false, forceSlugs = null, options = {}, logger, _getSlowThresholdMs) {
  const { forceWrite, revidChanges, pendingRevisionWrites } = buildFandomOptions(force, options);
  const teamsRaw = await loadTeamsConfig(env, githubClient);
  const processed = await fetchAndProcessFandom(env, runtimeConfig, cache, force, forceSlugs);
  if (!processed) return;

  const { failedSlugs, syncItems, skipItems, authContext } = processed;
  attachRevisionChanges([...syncItems, ...skipItems], revidChanges);
  const leagueLogEntries = buildLogs(runtimeConfig, processed, authContext, logger);
  const writeScopeSlugs = buildWriteScopeSlugs(runtimeConfig, syncItems, skipItems, forceWrite, forceSlugs);
  await persistWriteScope(env, runtimeConfig, cache, teamsRaw, writeScopeSlugs);
  await appendLeagueLogs(env, leagueLogEntries);
  await commitRevisionWrites(env, pendingRevisionWrites, failedSlugs);
}
