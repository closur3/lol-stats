import { login } from './fandom/auth.js';
import { fetchWithRetry } from './fandom/fetchWithRetry.js';
import { fetchAllMatches } from './fandom/matches.js';
import { fetchLatestRevision } from './fandom/revisions.js';
import { fetchAllSubpages } from './fandom/subpages.js';

export class FandomClient {
  constructor(authContext = null) {
    this.authContext = authContext;
  }

  static login = login;
  static fetchLatestRevision = fetchLatestRevision;
  static fetchAllSubpages = fetchAllSubpages;

  async fetchWithRetry(url, maxRetries) {
    return fetchWithRetry(this.authContext, url, maxRetries);
  }

  async fetchAllMatches(slug, sourceInput, dateFilter = null) {
    return fetchAllMatches(this, slug, sourceInput, dateFilter);
  }
}
