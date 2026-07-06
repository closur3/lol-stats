import { fetchWithRetry } from './fandom/fetchWithRetry.js';
import { fetchAllMatches } from './fandom/matches.js';

export class FandomClient {
  constructor(authContext = null) {
    this.authContext = authContext;
  }

  async fetchWithRetry(url, maxRetries) {
    return fetchWithRetry(this.authContext, url, maxRetries);
  }

  async fetchAllMatches(slug, sourceInput, dateFilter = null) {
    return fetchAllMatches(this, slug, sourceInput, dateFilter);
  }
}
