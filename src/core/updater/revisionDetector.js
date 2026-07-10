import { fetchLatestRevision } from '../../api/fandom/revisions.js';
import { fetchAllSubpages } from '../../api/fandom/subpages.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { normalizeOverviewPages, toDataPage } from '../../utils/data/overviewPages.js';

function hasRevisionRecordChanged(previousRecord, nextRecord) {
  if (previousRecord.slug !== nextRecord.slug) return true;

  const prevPages = previousRecord.pages;
  const nextPages = nextRecord.pages;
  const prevTitles = Object.keys(prevPages);
  const nextTitles = Object.keys(nextPages);
  if (prevTitles.length !== nextTitles.length) return true;

  for (const title of prevTitles) {
    if (!Object.prototype.hasOwnProperty.call(nextPages, title)) return true;
    const prevPage = prevPages[title];
    const nextPage = nextPages[title];
    if (prevPage.revid !== nextPage.revid) return true;
    if (prevPage.revisionTimeUTC !== nextPage.revisionTimeUTC) return true;
    if (prevPage.pageid !== nextPage.pageid) return true;
  }
  return false;
}

function normalizePreviousRevisionState(slug, previousRevisionState) {
  if (previousRevisionState == null) return { slug, pages: {} };
  if (typeof previousRevisionState !== "object" || Array.isArray(previousRevisionState)) {
    throw new Error(`REV state must be a JSON object: ${slug}`);
  }
  const storedPages = previousRevisionState.pages;
  if (!storedPages || typeof storedPages !== "object" || Array.isArray(storedPages)) {
    throw new Error(`REV pages must be a JSON object: ${slug}`);
  }
  const pages = {};
  for (const [title, page] of Object.entries(storedPages)) {
    if (!page || typeof page !== "object" || Array.isArray(page)) {
      throw new Error(`REV page must be a JSON object: ${slug}:${title}`);
    }
    if (!Number.isInteger(page.revid) || page.revid <= 0) throw new Error(`REV revid invalid: ${slug}:${title}`);
    if (!Number.isInteger(page.pageid) || page.pageid <= 0) throw new Error(`REV pageid invalid: ${slug}:${title}`);
    if (typeof page.revisionTimeUTC !== "string" || page.revisionTimeUTC.length === 0) {
      throw new Error(`REV revisionTimeUTC invalid: ${slug}:${title}`);
    }
    pages[title] = page;
  }
  return { slug, pages };
}

async function prepareRevisionCheck(env, tournament) {
  const slug = tournament?.slug;
  if (!slug) throw new Error("Tournament slug missing");

  const pages = normalizeOverviewPages(tournament.overviewPage);
  if (pages.length === 0) throw new Error(`Tournament overviewPage missing: ${slug}`);

  const dataPages = Array.from(new Set(pages.map(toDataPage)));
  const subpageResults = await Promise.all(dataPages.map(page => fetchAllSubpages(page)));
  const revisionDataPages = Array.from(new Set(subpageResults.flat()));

  const previousRevisionState = await env["lol-stats-kv"].get(kvKeys.rev(slug), { type: "json" });
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
  const prevRecord = normalizePreviousRevisionState(slug, previousRevisionState);
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
    nextPages[title] = {
      revid: latest.revid,
      revisionTimeUTC: latest.revisionTimeUTC,
      pageid: latest.pageid
    };

    const prevPage = prevPages[title];
    const prevRev = prevPage === undefined ? undefined : prevPage.revid;
    if (!prevRev || Number(prevRev) !== Number(latest.revid)) {
      changedPages.push(`${title}:${prevRev === undefined ? "none" : prevRev}->${latest.revid}`);
      const safeTitle = title.replace(/ /g, "_");
      revidChanges.push({
        revid: latest.revid,
        diffUrl: `https://lol.fandom.com/wiki/${safeTitle}?diff=prev&oldid=${latest.revid}`,
        title
      });
    }
  }

  const nextRecord = { slug, pages: nextPages };
  return {
    slug,
    shouldWriteRev: hasRevisionRecordChanged({ slug, pages: prevPages }, nextRecord),
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
