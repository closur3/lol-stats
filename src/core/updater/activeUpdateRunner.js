import { FandomClient } from '../../api/fandomClient.js';
import { Analyzer } from '../analyzer.js';
import { determineCandidates } from './candidates.js';
import { fetchMatchesForCandidates } from './matchDataFetcher.js';
import { assignTournamentTeamMaps } from './tournamentTeamMapAssigner.js';
import { applyRawMatchFetchResults } from './rawMatchFetchResultApplier.js';
import { generateLog, buildActiveLogEntries } from './logWriter.js';
import { buildWriteScopeSlugs, writeHomeProjections } from '../projection/homeProjector.js';
import { writeActiveTournamentFacts } from './activeTournamentFactWriter.js';
import { appendActiveLogs } from './logPersistence.js';
import { commitRevisionWrites } from './revWriter.js';
import { UPDATE_CONFIG } from './updateConfig.js';

function buildScopedTournaments(tournaments, scopeSlugs) {
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }
  return tournaments.filter(tournament => scopeSlugs.has(tournament.slug));
}

function buildScopedRawMatches(rawMatches, scopeSlugs) {
  return Object.fromEntries([...scopeSlugs].map(slug => {
    const matches = rawMatches[slug];
    if (!Array.isArray(matches)) throw new Error(`RawMatches missing in analysis scope: ${slug}`);
    return [slug, matches];
  }));
}

function buildFandomOptions(force, options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("fandom options must be a JSON object");
  }
  const revidChanges = options.revidChanges === undefined ? {} : options.revidChanges;
  const pendingRevisionWrites = options.pendingRevisionWrites === undefined ? {} : options.pendingRevisionWrites;
  if (!revidChanges || typeof revidChanges !== "object" || Array.isArray(revidChanges)) {
    throw new Error("revidChanges must be a JSON object");
  }
  if (!pendingRevisionWrites || typeof pendingRevisionWrites !== "object" || Array.isArray(pendingRevisionWrites)) {
    throw new Error("pendingRevisionWrites must be a JSON object");
  }
  return {
    forceWrite: options.forceWrite === undefined ? force : !!options.forceWrite,
    revidChanges,
    pendingRevisionWrites
  };
}

async function createFandomClient(env) {
  const authContext = await FandomClient.login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
  return {
    authContext,
    fandomClient: new FandomClient(authContext)
  };
}

async function fetchRawMatchChanges(env, tournaments, rawMatchesBySlug, force, forceSlugs) {
  const candidates = determineCandidates(tournaments, forceSlugs);
  if (candidates.length === 0) {
    console.log(`[FANDOM:SKIP] no-candidates`);
    return null;
  }

  const { authContext, fandomClient } = await createFandomClient(env);
  const results = await fetchMatchesForCandidates(fandomClient, candidates);
  const processed = applyRawMatchFetchResults(results, rawMatchesBySlug, force, forceSlugs, tournaments);
  const { syncItems, skipItems, dropBreakers, fetchErrors } = processed;
  console.log(`[FANDOM:PROCESS] sync=${syncItems.length} skip=${skipItems.length} breakers=${dropBreakers.length} errors=${fetchErrors.length}`);
  return { authContext, ...processed };
}

function attachRevisionChanges(items, revidChanges) {
  for (const item of items) {
    if (revidChanges[item.slug]) {
      item.revidChanges = revidChanges[item.slug];
    }
  }
}

function buildActiveUpdateLogs(tournaments, processed, authContext, logger) {
  const { syncItems, skipItems, dropBreakers, fetchErrors, displayNameMap } = processed;
  generateLog(syncItems, skipItems, dropBreakers, fetchErrors, authContext, logger);
  return buildActiveLogEntries(syncItems, skipItems, dropBreakers, fetchErrors, authContext, tournaments, displayNameMap);
}

function buildActiveAnalysis(scopedTournaments, rawMatchesBySlug, writeScopeSlugs) {
  const scopedRawMatches = buildScopedRawMatches(rawMatchesBySlug, writeScopeSlugs);
  return Analyzer.runFullAnalysis(scopedRawMatches, scopedTournaments, UPDATE_CONFIG.MAX_SCHEDULE_DAYS);
}

async function writeActiveProjections(env, scopedTournaments, analysis, writeScopeSlugs) {
  if (writeScopeSlugs.size === 0) return;
  await writeHomeProjections(env, scopedTournaments, analysis, writeScopeSlugs);
}

export async function runActiveUpdate(env, tournaments, teamsRaw, rawMatchesBySlug, force = false, forceSlugs = null, options = {}, logger) {
  const { forceWrite, revidChanges, pendingRevisionWrites } = buildFandomOptions(force, options);
  const processed = await fetchRawMatchChanges(env, tournaments, rawMatchesBySlug, force, forceSlugs);
  if (!processed) return;

  const { brokenSlugs, errorSlugs, syncItems, skipItems, authContext } = processed;
  attachRevisionChanges([...syncItems, ...skipItems], revidChanges);
  const activeLogEntries = buildActiveUpdateLogs(tournaments, processed, authContext, logger);

  const writeScopeSlugs = buildWriteScopeSlugs(tournaments, syncItems, skipItems, forceWrite, forceSlugs);
  const scopedTournaments = buildScopedTournaments(tournaments, writeScopeSlugs);
  let analysis = null;
  if (writeScopeSlugs.size > 0) {
    await assignTournamentTeamMaps(scopedTournaments, rawMatchesBySlug, teamsRaw);
    analysis = buildActiveAnalysis(scopedTournaments, rawMatchesBySlug, writeScopeSlugs);
    await writeActiveTournamentFacts(env, scopedTournaments, rawMatchesBySlug, analysis, writeScopeSlugs);
  }
  const failedSlugs = new Set([...brokenSlugs, ...errorSlugs]);
  await Promise.all([
    writeActiveProjections(env, scopedTournaments, analysis, writeScopeSlugs),
    appendActiveLogs(env, activeLogEntries),
    commitRevisionWrites(env, pendingRevisionWrites, failedSlugs)
  ]);
}
