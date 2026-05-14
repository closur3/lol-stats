export function hasRevisionRecordChanged(previousRecord, nextRecord) {
  assertRevisionRecord(previousRecord, "previous REV record");
  assertRevisionRecord(nextRecord, "next REV record");
  if (previousRecord.slug !== nextRecord.slug) return true;

  const prevPages = previousRecord.pages;
  const nextPages = nextRecord.pages;
  const prevTitles = Object.keys(prevPages);
  const nextTitles = Object.keys(nextPages);
  if (prevTitles.length !== nextTitles.length) return true;

  for (const title of prevTitles) {
    if (!Object.prototype.hasOwnProperty.call(nextPages, title)) return true;
    const prevPage = normalizeRevisionPage(previousRecord.slug, title, prevPages[title]);
    const nextPage = normalizeRevisionPage(nextRecord.slug, title, nextPages[title]);
    if (prevPage.revid !== nextPage.revid) return true;
    if (prevPage.revisionTimeUTC !== nextPage.revisionTimeUTC) return true;
    if (prevPage.pageid !== nextPage.pageid) return true;
  }
  return false;
}

function assertRevisionRecord(record, label) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`${label} must be a JSON object`);
  }
  if (!record.slug || typeof record.slug !== "string") {
    throw new Error(`${label} slug missing`);
  }
  if (!record.pages || typeof record.pages !== "object" || Array.isArray(record.pages)) {
    throw new Error(`${label} pages must be a JSON object`);
  }
}

function normalizeRevisionPage(slug, title, page) {
  if (!page || typeof page !== "object" || Array.isArray(page)) {
    throw new Error(`REV page must be a JSON object: ${slug}:${title}`);
  }
  const revid = Number(page.revid);
  const pageid = Number(page.pageid);
  if (!Number.isFinite(revid) || revid <= 0) throw new Error(`REV page revid invalid: ${slug}:${title}`);
  if (!Number.isFinite(pageid) || pageid <= 0) throw new Error(`REV page pageid invalid: ${slug}:${title}`);
  if (!page.revisionTimeUTC || typeof page.revisionTimeUTC !== "string") {
    throw new Error(`REV page revisionTimeUTC missing: ${slug}:${title}`);
  }
  return {
    revid,
    pageid,
    revisionTimeUTC: page.revisionTimeUTC
  };
}

export function normalizePreviousRevisionState(slug, previousRevisionState) {
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
