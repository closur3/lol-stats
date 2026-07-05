import { buildDisplayNameMap, getDisplayName } from './displayName.js';
import { UPDATE_CONFIG } from './updateConfig.js';

const getMatchKey = (match) => String(match.MatchId);

const canonicalMatch = (match) => [
  match.MatchId,
  match.Team1,
  match.Team2,
  match.Team1Score,
  match.Team2Score,
  match.DateTimeUTC,
  match.OverviewPage,
  match.BestOf,
  match.Tab
].join("\u001f");

function calcChangedCount(oldData, newData) {
  const oldMap = new Map();
  for (const matchRecord of oldData) oldMap.set(getMatchKey(matchRecord), canonicalMatch(matchRecord));

  let added = 0;
  let updated = 0;
  const newKeys = new Set();
  for (const matchRecord of newData) {
    const key = getMatchKey(matchRecord);
    newKeys.add(key);
    const prevVal = oldMap.get(key);
    if (prevVal == null) added++;
    else if (prevVal !== canonicalMatch(matchRecord)) updated++;
  }

  let deleted = 0;
  for (const key of oldMap.keys()) {
    if (!newKeys.has(key)) deleted++;
  }

  return { added, updated, deleted, changed: added + updated };
}

export function applyRawMatchFetchResults(results, rawMatchesBySlug, force, forceSlugs, tournaments) {
  const brokenSlugs = new Set();
  const errorSlugs = new Set();
  const syncItems = [];
  const skipItems = [];
  const dropBreakers = [];
  const fetchErrors = [];

  const displayNameMap = buildDisplayNameMap(tournaments);

  results.forEach(resultItem => {
    if (resultItem.status === 'fulfilled') {
      const slug = resultItem.slug;
      const newData = resultItem.data;
      const oldData = rawMatchesBySlug[slug];
      if (!Array.isArray(oldData)) throw new Error(`RawMatches missing in active update scope: ${slug}`);
      const isForce = force;

      if (!isForce && oldData.length > 10 && newData.length < oldData.length * UPDATE_CONFIG.DROP_THRESHOLD) {
        dropBreakers.push(`${slug}(Drop ${oldData.length}->${newData.length})`);
        brokenSlugs.add(slug);
      } else {
        const changedCount = calcChangedCount(oldData, newData);
        if (changedCount.changed === 0 && changedCount.deleted > 0) {
          if (isForce) {
            rawMatchesBySlug[slug] = newData;
            skipItems.push({ slug, displayName: getDisplayName(displayNameMap, slug), added: 0, updated: 0, isForce });
          } else {
            console.log(`[FANDOM:DROP_WARN] ${slug} records decreased ${oldData.length}->${newData.length} (deleted=${changedCount.deleted}), preserving previous RawMatches`);
            skipItems.push({ slug, displayName: getDisplayName(displayNameMap, slug), added: 0, updated: 0, isForce });
          }
        } else {
          rawMatchesBySlug[slug] = newData;
          if (changedCount.changed > 0) {
            syncItems.push({
              slug,
              displayName: getDisplayName(displayNameMap, slug),
              added: changedCount.added,
              updated: changedCount.updated,
              isForce
            });
          } else {
            skipItems.push({ slug, displayName: getDisplayName(displayNameMap, slug), added: 0, updated: 0, isForce });
          }
        }
      }
    } else {
      const errMsg = resultItem.err?.message || resultItem.err?.toString() || 'unknown';
      console.log(`[FANDOM:FETCH_ERR] ${resultItem.slug} error=${errMsg}`);
      fetchErrors.push(`${resultItem.slug}(Fail: ${errMsg.substring(0, 50)})`);
      errorSlugs.add(resultItem.slug);
    }
  });

  return { brokenSlugs, errorSlugs, syncItems, skipItems, dropBreakers, fetchErrors, displayNameMap };
}
