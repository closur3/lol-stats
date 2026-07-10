import { timePolicy } from '../../utils/timePolicy.js';

export function rpad2(n) {
  return n < 10 ? `${n}\u00A0` : `${n}`;
}

function pickLatestRevisionTrigger(revidChanges) {
  if (revidChanges === undefined) return null;
  if (!Array.isArray(revidChanges)) throw new Error("revidChanges must be an array");
  if (revidChanges.length === 0) return null;
  return revidChanges.reduce((latest, curr) =>
    Number(curr.revid) > Number(latest.revid) ? curr : latest
  );
}

export function buildActiveLogEntries(syncItems, skipItems, dropBreakers, fetchErrors, authContext, displayNameMap) {
  const loggedAt = timePolicy.getNow().fullDateTimeString;
  const isAnon = (!authContext || authContext.isAnonymous);
  const bySlug = {};

  if (!(displayNameMap instanceof Map)) throw new Error("displayNameMap must be a Map");

  const getDisplayName = (slug) => {
    if (!displayNameMap.has(slug)) throw new Error(`Tournament display name missing: ${slug}`);
    return displayNameMap.get(slug);
  };

  const pushEntry = (slug, entry) => {
    if (!slug) throw new Error("ActiveLog slug missing");
    bySlug[slug] = { loggedAt, ...entry };
  };

  syncItems.forEach(item => {
    pushEntry(item.slug, {
      action: "SYNC",
      level: "SUCCESS",
      displayName: getDisplayName(item.slug),
      added: item.added,
      updated: item.updated,
      trigger: pickLatestRevisionTrigger(item.revidChanges),
      isForce: item.isForce === true,
      isAnon
    });
  });

  skipItems.forEach(item => {
    if (bySlug[item.slug]) return;
    pushEntry(item.slug, {
      action: "SKIP",
      level: "SUCCESS",
      displayName: getDisplayName(item.slug),
      added: item.added,
      updated: item.updated,
      trigger: pickLatestRevisionTrigger(item.revidChanges),
      isForce: item.isForce === true,
      isAnon
    });
  });

  dropBreakers.forEach(breaker => {
    if (typeof breaker !== "string" || breaker.length === 0) throw new Error("breaker log item invalid");
    const slug = breaker.split("(")[0];
    const dropMatch = breaker.match(/\(Drop .+\)/);
    const dropInfo = dropMatch ? dropMatch[0] : "(Drop)";
    const name = getDisplayName(slug);
    pushEntry(slug, { action: "BREAKER", level: "ERROR", displayName: name, dropInfo, isAnon });
  });

  fetchErrors.forEach(fetchError => {
    if (typeof fetchError !== "string" || fetchError.length === 0) throw new Error("fetch error log item invalid");
    const slug = fetchError.split("(")[0];
    const name = getDisplayName(slug);
    pushEntry(slug, { action: "API_ERROR", level: "ERROR", displayName: name, isAnon });
  });

  return bySlug;
}
