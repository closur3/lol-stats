import { fetchLatestRevision } from '../../api/fandom/revisions.js';
import { fetchAllSubpages } from '../../api/fandom/subpages.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { getOverviewPageNames, toDataPage } from '../../utils/data/overviewPages.js';

function hasRevisionRecordChanged(previousRecord, nextRecord) {
  const prevPages = previousRecord.pages;
  const nextPages = nextRecord.pages;
  const prevTitles = Object.keys(prevPages);
  const nextTitles = Object.keys(nextPages);
  if (prevTitles.length !== nextTitles.length) return true;

  for (const title of prevTitles) {
    if (!Object.prototype.hasOwnProperty.call(nextPages, title)) return true;
    if (prevPages[title] !== nextPages[title]) return true;
  }
  return false;
}

function normalizePreviousRevisionState(slug, previousRevisionState) {
  if (previousRevisionState == null) return { pages: {} };
  if (typeof previousRevisionState !== "object" || Array.isArray(previousRevisionState)) {
    throw new Error(`REV state must be a JSON object: ${slug}`);
  }
  const fields = Object.keys(previousRevisionState);
  if (fields.length !== 1 || fields[0] !== "pages") throw new Error(`REV state fields invalid: ${slug}`);
  const storedPages = previousRevisionState.pages;
  if (!storedPages || typeof storedPages !== "object" || Array.isArray(storedPages)) {
    throw new Error(`REV pages must be a JSON object: ${slug}`);
  }
  const pages = {};
  for (const [title, revid] of Object.entries(storedPages)) {
    if (!title) throw new Error(`REV page title missing: ${slug}`);
    if (!Number.isInteger(revid) || revid <= 0) throw new Error(`REV revid invalid: ${slug}:${title}`);
    pages[title] = revid;
  }
  return { pages };
}

async function prepareRevisionCheck(env, tournament) {
  const slug = tournament?.slug;
  if (!slug) throw new Error("Tournament slug missing");

  const pages = getOverviewPageNames(tournament.overviewPages);
  if (pages.length === 0) throw new Error(`Tournament overviewPage missing: ${slug}`);

  const dataPages = Array.from(new Set(pages.map(toDataPage)));
  const subpageResults = await Promise.all(dataPages.map(page => fetchAllSubpages(page)));
  const revisionDataPages = Array.from(new Set(subpageResults.flat()));

  const storedRevisionState = await env["lol-stats-kv"].get(kvKeys.rev(slug));
  let previousRevisionState = storedRevisionState;
  if (typeof storedRevisionState === "string") {
    try {
      previousRevisionState = JSON.parse(storedRevisionState);
    } catch (error) {
      console.error(`[REV:REPAIR] unreadable FandomRevision ${slug}: ${error.message}`);
      previousRevisionState = null;
    }
  }
  console.log(`[REV:CHECK] ${slug}`);

  return {
    slug,
    dataPages: revisionDataPages,
    previousRevisionState
  };
}

async function fetchLatestRevisionPages(dataPages) {
  const pageResults = await Promise.all(
    dataPages.map(async (page) => {
      const latest = await fetchLatestRevision(page);
      return { page, latest };
    })
  );
  return pageResults.filter(pageResult => pageResult.latest.missing !== true);
}

async function evaluateRevisionCheck(check) {
  const { slug, dataPages, previousRevisionState } = check;
  let prevRecord;
  try {
    prevRecord = normalizePreviousRevisionState(slug, previousRevisionState);
  } catch (error) {
    console.error(`[REV:REPAIR] replacing invalid FandomRevision ${slug}: ${error.message}`);
    prevRecord = { pages: {} };
  }
  const prevPages = prevRecord.pages;
  const nextPages = {};
  const changedPages = [];
  const revidChanges = [];

  const pageResults = await fetchLatestRevisionPages(dataPages);

  for (const { page, latest } of pageResults) {
    const title = latest.title;
    if (typeof title !== "string" || title.length === 0) {
      throw new Error(`REV latest title missing: ${slug}:${page}`);
    }
    nextPages[title] = latest.revid;

    const prevRev = prevPages[title];
    if (!prevRev || Number(prevRev) !== Number(latest.revid)) {
      changedPages.push(`${title}:${prevRev === undefined ? "none" : prevRev}->${latest.revid}`);
      revidChanges.push({
        revid: latest.revid,
        title
      });
    }
  }

  const nextRecord = { pages: nextPages };
  return {
    slug,
    shouldWriteRev: hasRevisionRecordChanged({ pages: prevPages }, nextRecord),
    nextRecord,
    revisionChanged: changedPages.length > 0,
    changedPages,
    revidChanges
  };
}

async function collectRevisionChecks(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  return Promise.all(tournaments.map(tournament => prepareRevisionCheck(env, tournament)));
}

function applyRevisionCheckResult(revisionDetectionState, checkResult) {
  const { slug, shouldWriteRev, nextRecord, revisionChanged, changedPages, revidChanges: slugRevidChanges } = checkResult;

  if (shouldWriteRev) {
    revisionDetectionState.pendingRevisionWrites[slug] = nextRecord;
  }

  if (revisionChanged) {
    revisionDetectionState.changedSlugs.add(slug);
    revisionDetectionState.revidChanges[slug] = slugRevidChanges;
    console.log(`[REV:CHANGE] ${slug} pages=${changedPages.length}${changedPages.length ? ` | ${changedPages.join(", ")}` : ""}`);
  }
}

export async function detectRevisionChanges(env, tournaments) {
  const checks = await collectRevisionChecks(env, tournaments);
  const revisionDetectionState = {
    changedSlugs: new Set(),
    revidChanges: {},
    pendingRevisionWrites: {}
  };

  const revChecks = await Promise.all(checks.map(check => evaluateRevisionCheck(check)));
  for (const checkResult of revChecks) {
    applyRevisionCheckResult(revisionDetectionState, checkResult);
  }

  return {
    changedSlugs: revisionDetectionState.changedSlugs,
    revidChanges: revisionDetectionState.revidChanges,
    pendingRevisionWrites: revisionDetectionState.pendingRevisionWrites,
    checkedSlugs: checks.length
  };
}
