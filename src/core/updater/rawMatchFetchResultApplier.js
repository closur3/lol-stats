import { buildDisplayNameMap, getDisplayName } from './displayName.js';
import { updateConfig } from './updateConfig.js';

const getMatchKey = (match) => String(match.MatchId);

const canonicalMatch = (match) => [
  match.Team1,
  match.Team2,
  match.Winner,
  match.Team1Score,
  match.Team2Score,
  match.FF,
  match.IsNullified,
  match.DateTimeUTC,
  match.OverviewPage,
  match.BestOf,
  match.Tab,
  match.MatchId,
  JSON.stringify(match.games)
].join("\u001f");

function calcChangedCount(currentRawMatches, fetchedRawMatches) {
  const currentMatchSignaturesById = new Map();
  for (const matchRecord of currentRawMatches) currentMatchSignaturesById.set(getMatchKey(matchRecord), canonicalMatch(matchRecord));

  let added = 0;
  let updated = 0;
  const fetchedMatchIds = new Set();
  for (const matchRecord of fetchedRawMatches) {
    const key = getMatchKey(matchRecord);
    fetchedMatchIds.add(key);
    const currentMatchSignature = currentMatchSignaturesById.get(key);
    if (currentMatchSignature == null) added++;
    else if (currentMatchSignature !== canonicalMatch(matchRecord)) updated++;
  }

  let deleted = 0;
  for (const key of currentMatchSignaturesById.keys()) {
    if (!fetchedMatchIds.has(key)) deleted++;
  }

  return { added, updated, deleted, changed: added + updated };
}

export function applyRawMatchFetchOutcomes(fetchOutcomes, rawMatchesBySlug, force, tournaments) {
  const brokenSlugs = new Set();
  const errorSlugs = new Set();
  const syncItems = [];
  const skipItems = [];
  const dropBreakers = [];
  const fetchErrors = [];

  const displayNameMap = buildDisplayNameMap(tournaments);

  fetchOutcomes.forEach(fetchOutcome => {
    if (fetchOutcome.status === 'fulfilled') {
      const slug = fetchOutcome.slug;
      const fetchedRawMatches = fetchOutcome.rawMatches;
      const currentRawMatches = rawMatchesBySlug[slug];
      const isForce = force;

      if (currentRawMatches === null) {
        rawMatchesBySlug[slug] = fetchedRawMatches;
        syncItems.push({
          slug,
          displayName: getDisplayName(displayNameMap, slug),
          added: fetchedRawMatches.length,
          updated: 0,
          isForce
        });
        return;
      }
      if (!Array.isArray(currentRawMatches)) throw new Error(`RawMatches invalid in active update scope: ${slug}`);

      if (!isForce && currentRawMatches.length > 10 && fetchedRawMatches.length < currentRawMatches.length * updateConfig.dropThreshold) {
        dropBreakers.push(`${slug}(Drop ${currentRawMatches.length}->${fetchedRawMatches.length})`);
        brokenSlugs.add(slug);
      } else {
        const changedCount = calcChangedCount(currentRawMatches, fetchedRawMatches);
        if (changedCount.changed === 0 && changedCount.deleted > 0) {
          if (isForce) {
            rawMatchesBySlug[slug] = fetchedRawMatches;
            skipItems.push({ slug, displayName: getDisplayName(displayNameMap, slug), added: 0, updated: 0, isForce });
          } else {
            console.log(`[FANDOM:DROP_WARN] ${slug} records decreased ${currentRawMatches.length}->${fetchedRawMatches.length} (deleted=${changedCount.deleted}), preserving previous RawMatches`);
            skipItems.push({ slug, displayName: getDisplayName(displayNameMap, slug), added: 0, updated: 0, isForce });
          }
        } else {
          rawMatchesBySlug[slug] = fetchedRawMatches;
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
      const fetchErrorMessage = fetchOutcome.error?.message || fetchOutcome.error?.toString() || 'unknown';
      console.log(`[FANDOM:FETCH_ERR] ${fetchOutcome.slug} error=${fetchErrorMessage}`);
      fetchErrors.push(`${fetchOutcome.slug}(Fail: ${fetchErrorMessage.substring(0, 50)})`);
      errorSlugs.add(fetchOutcome.slug);
    }
  });

  return { brokenSlugs, errorSlugs, syncItems, skipItems, dropBreakers, fetchErrors, displayNameMap };
}
