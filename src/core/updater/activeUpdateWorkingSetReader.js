import { readPreviousRawMatchesMap } from '../facts/rawMatchesStore.js';

export async function readActiveUpdateWorkingSet(env, tournaments) {
  return {
    rawMatches: await readPreviousRawMatchesMap(env, tournaments),
    homes: {}
  };
}
