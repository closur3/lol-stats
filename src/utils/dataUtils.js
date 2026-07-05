import { extractCookies } from './data/cookies.js';
import { getFirstOverviewPage, normalizeOverviewPages, parseOverviewPages, toDataPage } from './data/overviewPages.js';
import { color, pct, rate } from './data/stats.js';
import { assertTeamAliasMap, filterTeamMapForMatches, pickTeamMap } from './data/teamMaps.js';
import { sortTeams } from './data/teamSort.js';

export const dataUtils = {
  rate,
  pct,
  color,
  extractCookies,
  sortTeams,
  assertTeamAliasMap,
  filterTeamMapForMatches,
  pickTeamMap,
  normalizeOverviewPages,
  toDataPage,
  parseOverviewPages,
  getFirstOverviewPage
};
