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
  match.MatchDay,
  match.NMatchInTab,
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

  return { added, updated, deleted, changed: added + updated + deleted };
}

export function applyRawMatchFetchOutcomes(fetchOutcomes, rawMatchesByName, rebuild, reasonsByName) {
  if (!(reasonsByName instanceof Map)) throw new Error("reasonsByName must be a Map");
  const brokenNames = new Set();
  const errorNames = new Set();
  const syncItems = [];
  const skipItems = [];
  const dropBreakers = [];
  const fetchErrors = [];

  fetchOutcomes.forEach(fetchOutcome => {
    if (fetchOutcome.status === 'fulfilled') {
      const tournamentName = fetchOutcome.tournamentName;
      const fetchedRawMatches = fetchOutcome.rawMatches;
      const currentRawMatches = rawMatchesByName[tournamentName];
      const updateReason = reasonsByName.get(tournamentName);
      if (!updateReason) throw new Error(`Active update reason missing: ${tournamentName}`);

      if (currentRawMatches === null) {
        rawMatchesByName[tournamentName] = fetchedRawMatches;
        syncItems.push({
          tournamentName,
          added: fetchedRawMatches.length,
          updated: 0,
          updateReason
        });
        return;
      }
      if (!Array.isArray(currentRawMatches)) throw new Error(`RawMatches invalid in active update scope: ${tournamentName}`);

      if (!rebuild && currentRawMatches.length > 10 && fetchedRawMatches.length < currentRawMatches.length * updateConfig.dropThreshold) {
        dropBreakers.push(`${tournamentName}(Drop ${currentRawMatches.length}->${fetchedRawMatches.length})`);
        brokenNames.add(tournamentName);
      } else {
        const changedCount = calcChangedCount(currentRawMatches, fetchedRawMatches);
        rawMatchesByName[tournamentName] = fetchedRawMatches;
        if (changedCount.changed > 0) {
          syncItems.push({
            tournamentName,
            added: changedCount.added,
            updated: changedCount.updated,
            updateReason
          });
        } else {
          skipItems.push({ tournamentName, added: 0, updated: 0, updateReason });
        }
      }
    } else {
      const fetchErrorMessage = fetchOutcome.error?.message || fetchOutcome.error?.toString() || 'unknown';
      console.log(`[FANDOM:FETCH_ERR] ${fetchOutcome.tournamentName} error=${fetchErrorMessage}`);
      fetchErrors.push(`${fetchOutcome.tournamentName}(Fail: ${fetchErrorMessage.substring(0, 50)})`);
      errorNames.add(fetchOutcome.tournamentName);
    }
  });

  return { brokenNames, errorNames, syncItems, skipItems, dropBreakers, fetchErrors };
}
