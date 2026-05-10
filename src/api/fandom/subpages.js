import { BOT_UA, FANDOM_API } from '../../constants/index.js';

export async function fetchAllSubpages(basePage) {
  const allPages = [basePage];
  let continueToken = null;

  do {
    const params = new URLSearchParams({
      action: "query",
      list: "allpages",
      apnamespace: "10008",
      apprefix: basePage.replace(/^Data:/, ""),
      apfrom: continueToken || "",
      aplimit: "500",
      format: "json"
    });

    const response = await fetch(`${FANDOM_API}?${params.toString()}`, {
      headers: { "User-Agent": BOT_UA, "Accept": "application/json" }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const pages = data?.query?.allpages || [];

    for (const page of pages) {
      const title = page.title;
      if (title.startsWith(basePage + "/")) {
        allPages.push(title);
      }
    }

    continueToken = data?.continue?.apcontinue || null;
  } while (continueToken);

  return Array.from(new Set(allPages));
}
