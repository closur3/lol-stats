import { timePolicy } from '../../utils/timePolicy.js';

export function padLogCount(value) {
  return value < 10 ? `${value}\u00A0` : `${value}`;
}

function pickLatestRevisionTrigger(revidChanges) {
  if (revidChanges === undefined) return null;
  if (!Array.isArray(revidChanges)) throw new Error("revidChanges must be an array");
  if (revidChanges.length === 0) return null;
  const latest = revidChanges.reduce((latestChange, currentChange) =>
    Number(currentChange.revid) > Number(latestChange.revid) ? currentChange : latestChange
  );
  if (typeof latest.title !== "string" || latest.title.length === 0) throw new Error("ActiveLog trigger title missing");
  if (!Number.isInteger(latest.revid) || latest.revid <= 0) throw new Error("ActiveLog trigger revid invalid");
  return { title: latest.title, revid: latest.revid };
}

function readUpdateReason(value) {
  if (!["added", "updated", "force", "revision"].includes(value)) {
    throw new Error(`Invalid ActiveLog update reason: ${value}`);
  }
  return value;
}

export function buildActiveLogEntries(syncItems, skipItems, dropBreakers, fetchErrors) {
  const loggedAt = timePolicy.getCurrentAppDateTime().fullDateTimeString;
  const logEntriesBySlug = {};

  const setLogEntry = (slug, logEntry) => {
    if (!slug) throw new Error("ActiveLog slug missing");
    logEntriesBySlug[slug] = { loggedAt, ...logEntry };
  };

  syncItems.forEach(syncItem => {
    setLogEntry(syncItem.slug, {
      action: "SYNC",
      added: syncItem.added,
      updated: syncItem.updated,
      trigger: pickLatestRevisionTrigger(syncItem.revidChanges),
      updateReason: readUpdateReason(syncItem.updateReason)
    });
  });

  skipItems.forEach(skipItem => {
    if (logEntriesBySlug[skipItem.slug]) return;
    setLogEntry(skipItem.slug, {
      action: "SKIP",
      added: skipItem.added,
      updated: skipItem.updated,
      trigger: pickLatestRevisionTrigger(skipItem.revidChanges),
      updateReason: readUpdateReason(skipItem.updateReason)
    });
  });

  dropBreakers.forEach(breaker => {
    if (typeof breaker !== "string" || breaker.length === 0) throw new Error("breaker log item invalid");
    const slug = breaker.split("(")[0];
    const dropMatch = breaker.match(/\(Drop .+\)/);
    const dropInfo = dropMatch ? dropMatch[0] : "(Drop)";
    setLogEntry(slug, { action: "BREAKER", dropInfo });
  });

  fetchErrors.forEach(fetchError => {
    if (typeof fetchError !== "string" || fetchError.length === 0) throw new Error("fetch error log item invalid");
    const slug = fetchError.split("(")[0];
    setLogEntry(slug, { action: "API_ERROR" });
  });

  return logEntriesBySlug;
}
