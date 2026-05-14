import { FandomClient } from '../../api/fandomClient.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { dataUtils } from '../../utils/dataUtils.js';

export function hasRevisionRecordChanged(previousRecord, nextRecord) {
  const prev = previousRecord || {};
  const next = nextRecord || {};
  if ((prev.slug || "") !== (next.slug || "")) return true;

  const prevPages = prev.pages && typeof prev.pages === "object" ? prev.pages : {};
  const nextPages = next.pages && typeof next.pages === "object" ? next.pages : {};
  const prevTitles = Object.keys(prevPages);
  const nextTitles = Object.keys(nextPages);
  if (prevTitles.length !== nextTitles.length) return true;

  for (const title of prevTitles) {
    if (!Object.prototype.hasOwnProperty.call(nextPages, title)) return true;
    const prevPage = prevPages[title] || {};
    const nextPage = nextPages[title] || {};
    if ((Number(prevPage.revid) || 0) !== (Number(nextPage.revid) || 0)) return true;
    if ((prevPage.revisionTimeUTC || "") !== (nextPage.revisionTimeUTC || "")) return true;
    if ((Number(prevPage.pageid) || 0) !== (Number(nextPage.pageid) || 0)) return true;
  }
  return false;
}

function normalizePreviousRevisionState(slug, previousRevisionState) {
  if (previousRevisionState == null) return { slug, pages: {} };
  if (typeof previousRevisionState !== "object" || Array.isArray(previousRevisionState)) {
    throw new Error(`REV state must be a JSON object: ${slug}`);
  }
  const pages = previousRevisionState.pages;
  if (!pages || typeof pages !== "object" || Array.isArray(pages)) {
    throw new Error(`REV pages must be a JSON object: ${slug}`);
  }
  return { slug, pages };
}

async function prepareRevisionCheck(env, tournament) {
  const slug = tournament?.slug;
  if (!slug) return null;

  const pages = dataUtils.normalizeOverviewPages(tournament.overview_page);
  if (pages.length === 0) return null;

  const dataPages = Array.from(new Set(pages.map(dataUtils.toDataPage)));
  const expandedDataPages = [];
  for (const dataPage of dataPages) {
    const subpages = await FandomClient.fetchAllSubpages(dataPage);
    expandedDataPages.push(...subpages);
  }

  const previousRevisionState = await env["lol-stats-kv"].get(kvKeys.rev(slug), { type: "json" });
  console.log(`[REV:CHECK] ${slug}`);

  return {
    slug,
    dataPages: Array.from(new Set(expandedDataPages)),
    previousRevisionState
  };
}

async function collectRevisionChecks(env, tournaments) {
  const errors = [];
  const checks = [];
  const results = await Promise.allSettled((tournaments || []).map(tournament => prepareRevisionCheck(env, tournament)));

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

async function fetchLatestRevisionPages(dataPages) {
  const pageResults = await Promise.all(
    dataPages.map(async (page) => {
      const latest = await FandomClient.fetchLatestRevision(page);
      return { page, latest };
    })
  );
  return pageResults.filter(pageResult => !pageResult.latest?.missing);
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
    const title = latest.title || page;
    nextPages[title] = {
      revid: latest.revid,
      revisionTimeUTC: latest.revisionTimeUTC,
      pageid: latest.pageid
    };

    const prevRev = prevPages?.[title]?.revid;
    if (!prevRev || Number(prevRev) !== Number(latest.revid)) {
      changedPages.push(`${title}:${prevRev || "none"}->${latest.revid}`);
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

export async function detectRevisionChanges(env, tournaments) {
  const changedSlugs = new Set();
  const revidChanges = {};
  const pendingRevisionWrites = {};
  const { checks: revisionChecks, errors } = await collectRevisionChecks(env, tournaments);
  let hasErrors = errors.length > 0;
  const checkedSlugs = revisionChecks.length;

  const revChecks = await Promise.allSettled(
    revisionChecks
      .map(check => evaluateRevisionCheck(check))
  );

  for (const checkResult of revChecks) {
    if (checkResult.status === 'rejected') {
      hasErrors = true;
      console.log(`[REV:ERROR] check failed: ${checkResult.reason?.message || 'unknown error'}`);
      continue;
    }

    const { slug, shouldWriteRev, nextRecord, revisionChanged, changedPages, revidChanges: slugRevidChanges } = checkResult.value;

    if (shouldWriteRev) {
      pendingRevisionWrites[slug] = nextRecord;
    }

    if (revisionChanged) {
      changedSlugs.add(slug);
      revidChanges[slug] = slugRevidChanges;
      console.log(`[REV:CHANGE] ${slug} pages=${changedPages.length}${changedPages.length ? ` | ${changedPages.join(", ")}` : ""}`);
    }
  }

  return { changedSlugs, revidChanges, pendingRevisionWrites, hasErrors, checkedSlugs };
}
