import { FandomClient } from '../../api/fandomClient.js';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { dataUtils } from '../../utils/dataUtils.js';
import { hasRevisionRecordChanged, normalizePreviousRevisionState } from './revisionState.js';

export async function prepareRevisionCheck(env, tournament) {
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

async function fetchLatestRevisionPages(dataPages) {
  const pageResults = await Promise.all(
    dataPages.map(async (page) => {
      const latest = await FandomClient.fetchLatestRevision(page);
      return { page, latest };
    })
  );
  return pageResults.filter(pageResult => !pageResult.latest?.missing);
}

export async function evaluateRevisionCheck(check) {
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
