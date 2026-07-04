import { readPreviousRawMatchesMap } from '../facts/rawMatchesStore.js';

export async function loadPreviousCachedData(env, tournaments) {
  return {
    rawMatches: await readPreviousRawMatchesMap(env, tournaments),
    homes: {}
  };
}
