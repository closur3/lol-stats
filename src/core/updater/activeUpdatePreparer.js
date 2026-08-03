import { FandomClient } from '../../api/fandomClient.js';
import { login } from '../../api/fandom/auth.js';
import { analyzeTournaments } from '../analyzer.js';
import { selectFetchCandidates } from './candidates.js';
import { fetchRawMatchesForCandidates } from './matchDataFetcher.js';
import { applyRawMatchFetchOutcomes } from './rawMatchFetchResultApplier.js';
import { buildActiveLogEntries } from './logWriter.js';
import { buildHomeSnapshots, buildWriteScopeSlugs } from '../projection/homeProjector.js';
import { buildScheduleSessions } from '../analysis/scheduleSessions.js';
import { normalizeScheduleSessions } from '../facts/scheduleSessionsStore.js';
import { readActiveHomeIssue } from './activeHomeReader.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';

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
  if (!revidChanges || typeof revidChanges !== "object" || Array.isArray(revidChanges)) {
    throw new Error("revidChanges must be a JSON object");
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
    revidChanges
  };
}

async function createFandomClient(env) {
  const authContext = await login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
  return new FandomClient(authContext);
}

async function fetchRawMatchChanges(env, tournaments, rawMatchesBySlug, targetSlugs, rebuild, reasonsBySlug) {
  const candidates = selectFetchCandidates(tournaments, targetSlugs);
  if (candidates.length !== targetSlugs.size) throw new Error("Active fetch candidate scope mismatch");

  const fandomClient = await createFandomClient(env);
  const fetchOutcomes = await fetchRawMatchesForCandidates(fandomClient, candidates);
  const rawMatchUpdate = applyRawMatchFetchOutcomes(fetchOutcomes, rawMatchesBySlug, rebuild, reasonsBySlug);
  const { syncItems, skipItems, dropBreakers, fetchErrors } = rawMatchUpdate;
  console.log(`[FANDOM:PROCESS] sync=${syncItems.length} skip=${skipItems.length} breakers=${dropBreakers.length} errors=${fetchErrors.length}`);
  return rawMatchUpdate;
}

function attachRevisionChanges(updateItems, revidChanges) {
  for (const updateItem of updateItems) {
    if (revidChanges[updateItem.slug]) {
      updateItem.revidChanges = revidChanges[updateItem.slug];
    }
  }
}

function buildActiveUpdateLogs(rawMatchUpdate) {
  const { syncItems, skipItems, dropBreakers, fetchErrors } = rawMatchUpdate;
  return buildActiveLogEntries(syncItems, skipItems, dropBreakers, fetchErrors);
}

function partitionActiveLogs(activeLogEntries, reasonsBySlug) {
  const appendEntries = {};
  const replaceEntries = {};
  for (const [slug, entry] of Object.entries(activeLogEntries)) {
    const target = reasonsBySlug.get(slug) === "force" ? replaceEntries : appendEntries;
    target[slug] = entry;
  }
  return { appendEntries, replaceEntries };
}

function buildRejectedPlan(rawMatchUpdate, activeLogEntries) {
  const failedSlugs = new Set([...rawMatchUpdate.brokenSlugs, ...rawMatchUpdate.errorSlugs]);
  if (failedSlugs.size === 0) return null;

  const failureEntries = Object.fromEntries([...failedSlugs].map(slug => {
    const entry = activeLogEntries[slug];
    if (!entry) throw new Error(`Active update failure log missing: ${slug}`);
    return [slug, entry];
  }));
  const details = [];
  if (rawMatchUpdate.brokenSlugs.size > 0) {
    details.push(`drop breaker: ${[...rawMatchUpdate.brokenSlugs].sort().join(",")}`);
  }
  if (rawMatchUpdate.errorSlugs.size > 0) {
    details.push(`fetch failed: ${[...rawMatchUpdate.errorSlugs].sort().join(",")}`);
  }
  return {
    accepted: false,
    failureMessage: `Active update rejected (${details.join("; ")})`,
    activeLogWrites: { appendEntries: failureEntries, replaceEntries: {} }
  };
}

function buildActiveAnalysis(scopedTournaments, rawMatchesBySlug, writeScopeSlugs) {
  const scopedRawMatches = buildScopedRawMatches(rawMatchesBySlug, writeScopeSlugs);
  return analyzeTournaments(scopedRawMatches, scopedTournaments);
}

function buildScheduleSessionsBySlug(scopedTournaments, rawMatchesBySlug) {
  return Object.fromEntries(scopedTournaments.map(tournament => {
    const rawMatches = rawMatchesBySlug[tournament.slug];
    if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in schedule scope: ${tournament.slug}`);
    const normalized = normalizeScheduleSessions(
      tournament.slug,
      buildScheduleSessions(rawMatches, tournament)
    );
    return [tournament.slug, { sessions: normalized.sessions }];
  }));
}

function selectWriteValues(valuesBySlug, writeScopeSlugs, label) {
  return Object.fromEntries([...writeScopeSlugs].map(slug => {
    const value = valuesBySlug[slug];
    if (value === undefined) throw new Error(`${label} missing in write scope: ${slug}`);
    return [slug, value];
  }));
}

function assertHomeSnapshots(scopedTournaments, homeSnapshotsBySlug) {
  const issues = scopedTournaments.flatMap(tournament => {
    const issue = readActiveHomeIssue(
      homeSnapshotsBySlug[tournament.slug],
      tournament,
      kvKeys.home(tournament.slug)
    );
    return issue ? [issue] : [];
  });
  throwIfArtifactsUnavailable("prepared ActiveHome", issues);
}

export async function prepareActiveUpdate(env, tournaments, rawMatchesBySlug, targetSlugs, options = {}) {
  const { reasonsBySlug, rebuild, revidChanges } = buildUpdateOptions(targetSlugs, options);
  const targetTournaments = buildScopedTournaments(tournaments, targetSlugs);
  if (targetTournaments.length !== targetSlugs.size) throw new Error("Active update tournament scope mismatch");
  const rawMatchUpdate = await fetchRawMatchChanges(env, tournaments, rawMatchesBySlug, targetSlugs, rebuild, reasonsBySlug);

  const { syncItems, skipItems } = rawMatchUpdate;
  attachRevisionChanges([...syncItems, ...skipItems], revidChanges);
  const activeLogEntries = buildActiveUpdateLogs(rawMatchUpdate);
  const rejectedPlan = buildRejectedPlan(rawMatchUpdate, activeLogEntries);
  if (rejectedPlan) return rejectedPlan;
  const { appendEntries, replaceEntries } = partitionActiveLogs(activeLogEntries, reasonsBySlug);

  const writeScopeSlugs = buildWriteScopeSlugs([...syncItems, ...skipItems], rebuild ? targetSlugs : new Set());
  const scopedTournaments = buildScopedTournaments(tournaments, writeScopeSlugs);
  const analysis = buildActiveAnalysis(scopedTournaments, rawMatchesBySlug, writeScopeSlugs);
  const scheduleSessionsBySlug = buildScheduleSessionsBySlug(scopedTournaments, rawMatchesBySlug);
  const homeSnapshotsBySlug = buildHomeSnapshots(scopedTournaments, analysis, writeScopeSlugs);
  assertHomeSnapshots(scopedTournaments, homeSnapshotsBySlug);
  return {
    accepted: true,
    rawMatchesBySlug: selectWriteValues(rawMatchesBySlug, writeScopeSlugs, "RawMatches"),
    scheduleSessionsBySlug,
    homeSnapshotsBySlug,
    activeLogWrites: { appendEntries, replaceEntries }
  };
}
