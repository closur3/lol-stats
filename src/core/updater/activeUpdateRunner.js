import { FandomClient } from '../../api/fandomClient.js';
import { login } from '../../api/fandom/auth.js';
import { analyzeTournaments } from '../analyzer.js';
import { selectFetchCandidates } from './candidates.js';
import { fetchRawMatchesForCandidates } from './matchDataFetcher.js';
import { applyRawMatchFetchOutcomes } from './rawMatchFetchResultApplier.js';
import { buildActiveLogEntries } from './logWriter.js';
import { buildWriteScopeSlugs, writeHomeProjections } from '../projection/homeProjector.js';
import { writeActiveTournamentFacts } from './activeTournamentFactWriter.js';
import { appendActiveLogs } from './logPersistence.js';
import { commitRevisionWrites } from './revWriter.js';

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

function buildUpdateOptions(targetSlugs, options) {
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
  if (!(targetSlugs instanceof Set)) throw new Error("targetSlugs must be a Set");
  if (!(options.reasonsBySlug instanceof Map)) throw new Error("reasonsBySlug must be a Map");
  if (options.reasonsBySlug.size !== targetSlugs.size) throw new Error("Active update reasons do not match target slugs");
  const rebuild = options.rebuild === true;
  const allowedReasons = new Set(["added", "updated", "force", "revision"]);
  for (const slug of targetSlugs) {
    const reason = options.reasonsBySlug.get(slug);
    if (!reason) throw new Error(`Active update reason missing: ${slug}`);
    if (!allowedReasons.has(reason)) throw new Error(`Invalid active update reason: ${slug}:${reason}`);
    if (rebuild ? reason === "revision" : reason !== "revision") {
      throw new Error(`Active update reason does not match execution mode: ${slug}:${reason}`);
    }
  }
  return {
    reasonsBySlug: options.reasonsBySlug,
    rebuild,
    revidChanges,
    pendingRevisionWrites
  };
}

async function createFandomClient(env) {
  const authContext = await login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
  return {
    authContext,
    fandomClient: new FandomClient(authContext)
  };
}

async function fetchRawMatchChanges(env, tournaments, rawMatchesBySlug, targetSlugs, rebuild, reasonsBySlug) {
  const candidates = selectFetchCandidates(tournaments, targetSlugs);
  if (candidates.length === 0) {
    console.log(`[FANDOM:SKIP] no-candidates`);
    return null;
  }

  const { authContext, fandomClient } = await createFandomClient(env);
  const fetchOutcomes = await fetchRawMatchesForCandidates(fandomClient, candidates);
  const rawMatchUpdate = applyRawMatchFetchOutcomes(fetchOutcomes, rawMatchesBySlug, rebuild, reasonsBySlug, tournaments);
  const { syncItems, skipItems, dropBreakers, fetchErrors } = rawMatchUpdate;
  console.log(`[FANDOM:PROCESS] sync=${syncItems.length} skip=${skipItems.length} breakers=${dropBreakers.length} errors=${fetchErrors.length}`);
  return { authContext, ...rawMatchUpdate };
}

function attachRevisionChanges(updateItems, revidChanges) {
  for (const updateItem of updateItems) {
    if (revidChanges[updateItem.slug]) {
      updateItem.revidChanges = revidChanges[updateItem.slug];
    }
  }
}

function buildActiveUpdateLogs(rawMatchUpdate, authContext) {
  const { syncItems, skipItems, dropBreakers, fetchErrors, displayNameMap } = rawMatchUpdate;
  return buildActiveLogEntries(syncItems, skipItems, dropBreakers, fetchErrors, authContext, displayNameMap);
}

function assertRebuildFetchSucceeded(rebuild, rawMatchUpdate) {
  if (!rebuild || rawMatchUpdate.errorSlugs.size === 0) return;
  throw new Error(`Active rebuild fetch failed: ${Array.from(rawMatchUpdate.errorSlugs).sort().join(",")}`);
}

function buildActiveAnalysis(scopedTournaments, rawMatchesBySlug, writeScopeSlugs) {
  const scopedRawMatches = buildScopedRawMatches(rawMatchesBySlug, writeScopeSlugs);
  return analyzeTournaments(scopedRawMatches, scopedTournaments);
}

async function writeActiveProjections(env, scopedTournaments, analysis, writeScopeSlugs) {
  if (writeScopeSlugs.size === 0) return;
  await writeHomeProjections(env, scopedTournaments, analysis, writeScopeSlugs);
}

export async function runActiveUpdate(env, tournaments, rawMatchesBySlug, targetSlugs, options = {}) {
  const { reasonsBySlug, rebuild, revidChanges, pendingRevisionWrites } = buildUpdateOptions(targetSlugs, options);
  const rawMatchUpdate = await fetchRawMatchChanges(env, tournaments, rawMatchesBySlug, targetSlugs, rebuild, reasonsBySlug);
  if (!rawMatchUpdate) return;
  assertRebuildFetchSucceeded(rebuild, rawMatchUpdate);

  const { brokenSlugs, errorSlugs, syncItems, skipItems, authContext } = rawMatchUpdate;
  attachRevisionChanges([...syncItems, ...skipItems], revidChanges);
  const activeLogEntries = buildActiveUpdateLogs(rawMatchUpdate, authContext);

  const writeScopeSlugs = buildWriteScopeSlugs(syncItems, rebuild ? targetSlugs : new Set());
  const scopedTournaments = buildScopedTournaments(tournaments, writeScopeSlugs);
  let analysis = null;
  if (writeScopeSlugs.size > 0) {
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
