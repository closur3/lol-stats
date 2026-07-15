import { timePolicy } from '../../utils/timePolicy.js';

export function padLogCount(value) {
  return value < 10 ? `${value}\u00A0` : `${value}`;
}

function pickLatestRevisionTrigger(revidChanges) {
  if (revidChanges === undefined) return null;
  if (!Array.isArray(revidChanges)) throw new Error("revidChanges must be an array");
  if (revidChanges.length === 0) return null;
  return revidChanges.reduce((latestChange, currentChange) =>
    Number(currentChange.revid) > Number(latestChange.revid) ? currentChange : latestChange
  );
}

function readUpdateReason(value) {
  if (!["added", "updated", "force", "revision"].includes(value)) {
    throw new Error(`Invalid ActiveLog update reason: ${value}`);
  }
  return value;
}

export function buildActiveLogEntries(syncItems, skipItems, dropBreakers, fetchErrors, authContext, displayNameMap) {
  const loggedAt = timePolicy.getCurrentAppDateTime().fullDateTimeString;
  const isAnon = (!authContext || authContext.isAnonymous);
  const logEntriesBySlug = {};

  if (!(displayNameMap instanceof Map)) throw new Error("displayNameMap must be a Map");

  const getDisplayName = (slug) => {
    if (!displayNameMap.has(slug)) throw new Error(`Tournament display name missing: ${slug}`);
    return displayNameMap.get(slug);
  };

  const setLogEntry = (slug, logEntry) => {
    if (!slug) throw new Error("ActiveLog slug missing");
    logEntriesBySlug[slug] = { loggedAt, ...logEntry };
  };

  syncItems.forEach(syncItem => {
    setLogEntry(syncItem.slug, {
      action: "SYNC",
      level: "SUCCESS",
      displayName: getDisplayName(syncItem.slug),
      added: syncItem.added,
      updated: syncItem.updated,
      trigger: pickLatestRevisionTrigger(syncItem.revidChanges),
      updateReason: readUpdateReason(syncItem.updateReason),
      isAnon
    });
  });

  skipItems.forEach(skipItem => {
    if (logEntriesBySlug[skipItem.slug]) return;
    setLogEntry(skipItem.slug, {
      action: "SKIP",
      level: "SUCCESS",
      displayName: getDisplayName(skipItem.slug),
      added: skipItem.added,
      updated: skipItem.updated,
      trigger: pickLatestRevisionTrigger(skipItem.revidChanges),
      updateReason: readUpdateReason(skipItem.updateReason),
      isAnon
    });
  });

  dropBreakers.forEach(breaker => {
    if (typeof breaker !== "string" || breaker.length === 0) throw new Error("breaker log item invalid");
    const slug = breaker.split("(")[0];
    const dropMatch = breaker.match(/\(Drop .+\)/);
    const dropInfo = dropMatch ? dropMatch[0] : "(Drop)";
    const name = getDisplayName(slug);
    setLogEntry(slug, { action: "BREAKER", level: "ERROR", displayName: name, dropInfo, isAnon });
  });

  fetchErrors.forEach(fetchError => {
    if (typeof fetchError !== "string" || fetchError.length === 0) throw new Error("fetch error log item invalid");
    const slug = fetchError.split("(")[0];
    const name = getDisplayName(slug);
    setLogEntry(slug, { action: "API_ERROR", level: "ERROR", displayName: name, isAnon });
  });

  return logEntriesBySlug;
}
