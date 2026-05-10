import { BOT_UA, FANDOM_API } from '../../constants/index.js';

export async function fetchLatestRevision(pageTitle, maxRetries = 3) {
  const revisionParams = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: pageTitle,
    rvlimit: "1",
    rvprop: "ids|timestamp",
    format: "json"
  });

  let attempt = 1;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(`${FANDOM_API}?${revisionParams.toString()}`, {
        headers: { "User-Agent": BOT_UA, "Accept": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const revisionPayload = await response.json();
      const pagesObj = revisionPayload?.query?.pages || {};
      const firstPage = Object.values(pagesObj)[0];
      if (!firstPage) throw new Error("Invalid revision payload");
      if (firstPage.missing !== undefined) {
        return {
          pageid: firstPage.pageid || null,
          title: firstPage.title || pageTitle,
          missing: true
        };
      }
      const rev = firstPage?.revisions?.[0];
      if (!rev || typeof rev.revid !== "number") throw new Error("Invalid revision payload");
      return {
        pageid: firstPage.pageid,
        title: firstPage.title || pageTitle,
        revid: rev.revid,
        parentid: rev.parentid || null,
        timestamp: rev.timestamp || null,
        missing: false
      };
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      await new Promise(resolveDelay => setTimeout(resolveDelay, 1000 * attempt));
      attempt++;
    }
  }
}
