import { evaluateRevisionCheck, prepareRevisionCheck } from './revisionFetch.js';
export { hasRevisionRecordChanged } from './revisionState.js';

async function collectRevisionChecks(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const errors = [];
  const checks = [];
  const results = await Promise.allSettled(tournaments.map(tournament => prepareRevisionCheck(env, tournament)));

  for (const result of results) {
    if (result.status === "rejected") {
      errors.push(result.reason);
      console.log(`[REV:ERROR] prepare failed: ${result.reason?.message || "unknown error"}`);
      continue;
    }
    if (result.value) checks.push(result.value);
  }

  return { checks, errors };
}

function applyRevisionCheckResult(state, checkResult) {
  if (checkResult.status === 'rejected') {
    state.hasErrors = true;
    console.log(`[REV:ERROR] check failed: ${checkResult.reason?.message || 'unknown error'}`);
    return;
  }

  const { slug, shouldWriteRev, nextRecord, revisionChanged, changedPages, revidChanges: slugRevidChanges } = checkResult.value;

  if (shouldWriteRev) {
    state.pendingRevisionWrites[slug] = nextRecord;
  }

  if (revisionChanged) {
    state.changedSlugs.add(slug);
    state.revidChanges[slug] = slugRevidChanges;
    console.log(`[REV:CHANGE] ${slug} pages=${changedPages.length}${changedPages.length ? ` | ${changedPages.join(", ")}` : ""}`);
  }
}

export async function detectRevisionChanges(env, tournaments) {
  const { checks, errors } = await collectRevisionChecks(env, tournaments);
  const state = {
    changedSlugs: new Set(),
    revidChanges: {},
    pendingRevisionWrites: {},
    hasErrors: errors.length > 0
  };

  const revChecks = await Promise.allSettled(checks.map(check => evaluateRevisionCheck(check)));
  for (const checkResult of revChecks) {
    applyRevisionCheckResult(state, checkResult);
  }

  return {
    changedSlugs: state.changedSlugs,
    revidChanges: state.revidChanges,
    pendingRevisionWrites: state.pendingRevisionWrites,
    hasErrors: state.hasErrors,
    checkedSlugs: checks.length
  };
}
