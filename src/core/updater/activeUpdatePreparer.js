import { FandomClient } from '../../api/fandomClient.js';
import { login } from '../../api/fandom/auth.js';
import { analyzeTournaments } from '../analyzer.js';
import { selectFetchCandidates } from './candidates.js';
import { fetchRawMatchesForCandidates } from './matchDataFetcher.js';
import { applyRawMatchFetchOutcomes } from './rawMatchFetchResultApplier.js';
import { buildActiveLogEntries } from './logWriter.js';
import { buildActiveSnapshots, buildWriteScopeNames } from '../projection/activeProjector.js';
import { buildScheduleSessions } from '../analysis/scheduleSessions.js';
import { normalizeScheduleSessions } from '../facts/scheduleSessionsStore.js';
import { readActiveSnapshotIssue } from './activeSnapshotReader.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';

function buildScopedTournaments(tournaments, scopeNames) {
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }
  return tournaments.filter(tournament => scopeNames.has(tournament.name));
}

function buildScopedRawMatches(rawMatches, scopeNames) {
  return Object.fromEntries([...scopeNames].map(tournamentName => {
    const matches = rawMatches[tournamentName];
    if (!Array.isArray(matches)) throw new Error(`RawMatches missing in analysis scope: ${tournamentName}`);
    return [tournamentName, matches];
  }));
}

function buildUpdateOptions(targetNames, options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("fandom options must be a JSON object");
  }
  const revidChanges = options.revidChanges === undefined ? {} : options.revidChanges;
  if (!revidChanges || typeof revidChanges !== "object" || Array.isArray(revidChanges)) {
    throw new Error("revidChanges must be a JSON object");
  }
  if (!(targetNames instanceof Set)) throw new Error("targetNames must be a Set");
  if (!(options.reasonsByName instanceof Map)) throw new Error("reasonsByName must be a Map");
  if (options.reasonsByName.size !== targetNames.size) throw new Error("Active update reasons do not match target names");
  const rebuild = options.rebuild === true;
  const allowedReasons = new Set(["added", "updated", "force", "revision"]);
  for (const tournamentName of targetNames) {
    const reason = options.reasonsByName.get(tournamentName);
    if (!reason) throw new Error(`Active update reason missing: ${tournamentName}`);
    if (!allowedReasons.has(reason)) throw new Error(`Invalid active update reason: ${tournamentName}:${reason}`);
    if (rebuild ? reason === "revision" : reason !== "revision") {
      throw new Error(`Active update reason does not match execution mode: ${tournamentName}:${reason}`);
    }
  }
  return {
    reasonsByName: options.reasonsByName,
    rebuild,
    revidChanges
  };
}

async function createFandomClient(env) {
  const authContext = await login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
  return new FandomClient(authContext);
}

async function fetchRawMatchChanges(env, tournaments, rawMatchesByName, targetNames, rebuild, reasonsByName) {
  const candidates = selectFetchCandidates(tournaments, targetNames);
  if (candidates.length !== targetNames.size) throw new Error("Active fetch candidate scope mismatch");

  const fandomClient = await createFandomClient(env);
  const fetchOutcomes = await fetchRawMatchesForCandidates(fandomClient, candidates);
  const rawMatchUpdate = applyRawMatchFetchOutcomes(fetchOutcomes, rawMatchesByName, rebuild, reasonsByName);
  const { syncItems, skipItems, dropBreakers, fetchErrors } = rawMatchUpdate;
  console.log(`[FANDOM:PROCESS] sync=${syncItems.length} skip=${skipItems.length} breakers=${dropBreakers.length} errors=${fetchErrors.length}`);
  return rawMatchUpdate;
}

function attachRevisionChanges(updateItems, revidChanges) {
  for (const updateItem of updateItems) {
    if (revidChanges[updateItem.tournamentName]) {
      updateItem.revidChanges = revidChanges[updateItem.tournamentName];
    }
  }
}

function buildActiveUpdateLogs(rawMatchUpdate) {
  const { syncItems, skipItems, dropBreakers, fetchErrors } = rawMatchUpdate;
  return buildActiveLogEntries(syncItems, skipItems, dropBreakers, fetchErrors);
}

function partitionActiveLogs(activeLogEntries, reasonsByName) {
  const appendEntries = {};
  const repairEntries = {};
  for (const [tournamentName, entry] of Object.entries(activeLogEntries)) {
    const target = reasonsByName.get(tournamentName) === "force" ? repairEntries : appendEntries;
    target[tournamentName] = entry;
  }
  return { appendEntries, repairEntries };
}

function buildRejectedPlan(rawMatchUpdate, activeLogEntries) {
  const failedNames = new Set([...rawMatchUpdate.brokenNames, ...rawMatchUpdate.errorNames]);
  if (failedNames.size === 0) return null;

  const failureEntries = Object.fromEntries([...failedNames].map(tournamentName => {
    const entry = activeLogEntries[tournamentName];
    if (!entry) throw new Error(`Active update failure log missing: ${tournamentName}`);
    return [tournamentName, entry];
  }));
  const details = [];
  if (rawMatchUpdate.brokenNames.size > 0) {
    details.push(`drop breaker: ${[...rawMatchUpdate.brokenNames].sort().join(",")}`);
  }
  if (rawMatchUpdate.errorNames.size > 0) {
    details.push(`fetch failed: ${[...rawMatchUpdate.errorNames].sort().join(",")}`);
  }
  return {
    accepted: false,
    failureMessage: `Active update rejected (${details.join("; ")})`,
    activeLogWrites: { appendEntries: failureEntries, repairEntries: {} }
  };
}

function buildActiveAnalysis(scopedTournaments, rawMatchesByName, writeScopeNames) {
  const scopedRawMatches = buildScopedRawMatches(rawMatchesByName, writeScopeNames);
  return analyzeTournaments(scopedRawMatches, scopedTournaments);
}

function buildScheduleSessionsByName(scopedTournaments, rawMatchesByName) {
  return Object.fromEntries(scopedTournaments.map(tournament => {
    const rawMatches = rawMatchesByName[tournament.name];
    if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in schedule scope: ${tournament.name}`);
    const normalized = normalizeScheduleSessions(
      tournament.name,
      buildScheduleSessions(rawMatches, tournament)
    );
    return [tournament.name, { sessions: normalized.sessions }];
  }));
}

function selectWriteValues(valuesByName, writeScopeNames, label) {
  return Object.fromEntries([...writeScopeNames].map(tournamentName => {
    const value = valuesByName[tournamentName];
    if (value === undefined) throw new Error(`${label} missing in write scope: ${tournamentName}`);
    return [tournamentName, value];
  }));
}

function assertActiveSnapshots(scopedTournaments, activeSnapshotsByName) {
  const issues = scopedTournaments.flatMap(tournament => {
    const issue = readActiveSnapshotIssue(
      activeSnapshotsByName[tournament.name],
      tournament,
      kvKeys.active(tournament.name)
    );
    return issue ? [issue] : [];
  });
  throwIfArtifactsUnavailable("prepared ActiveSnapshot", issues);
}

export async function prepareActiveUpdate(env, tournaments, rawMatchesByName, targetNames, options = {}) {
  const { reasonsByName, rebuild, revidChanges } = buildUpdateOptions(targetNames, options);
  const targetTournaments = buildScopedTournaments(tournaments, targetNames);
  if (targetTournaments.length !== targetNames.size) throw new Error("Active update tournament scope mismatch");
  const rawMatchUpdate = await fetchRawMatchChanges(env, tournaments, rawMatchesByName, targetNames, rebuild, reasonsByName);

  const { syncItems, skipItems } = rawMatchUpdate;
  attachRevisionChanges([...syncItems, ...skipItems], revidChanges);
  const activeLogEntries = buildActiveUpdateLogs(rawMatchUpdate);
  const rejectedPlan = buildRejectedPlan(rawMatchUpdate, activeLogEntries);
  if (rejectedPlan) return rejectedPlan;
  const { appendEntries, repairEntries } = partitionActiveLogs(activeLogEntries, reasonsByName);
  const writeScopeNames = buildWriteScopeNames([...syncItems, ...skipItems], rebuild ? targetNames : new Set());
  const scopedTournaments = buildScopedTournaments(tournaments, writeScopeNames);
  const analysis = buildActiveAnalysis(scopedTournaments, rawMatchesByName, writeScopeNames);
  const scheduleSessionsByName = buildScheduleSessionsByName(scopedTournaments, rawMatchesByName);
  const activeSnapshotsByName = buildActiveSnapshots(scopedTournaments, analysis, writeScopeNames);
  assertActiveSnapshots(scopedTournaments, activeSnapshotsByName);
  return {
    accepted: true,
    rawMatchesByName: selectWriteValues(rawMatchesByName, writeScopeNames, "RawMatches"),
    scheduleSessionsByName,
    activeSnapshotsByName,
    activeLogWrites: { appendEntries, repairEntries }
  };
}
