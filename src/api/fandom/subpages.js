import { botUserAgent, fandomApi } from '../../constants/index.js';

function readAllPages(data) {
  const pages = data?.query?.allpages;
  if (!Array.isArray(pages)) throw new Error("Invalid subpages payload");
  return pages;
}

function isDataPageNumberedPagination(basePage, title) {
  return title === basePage || new RegExp(`^${basePage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\d+$`).test(title);
}

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

    const response = await fetch(`${fandomApi}?${params.toString()}`, {
      headers: { "User-Agent": botUserAgent, "Accept": "application/json" }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const pages = readAllPages(data);

    for (const page of pages) {
      const title = page.title;
      if (isDataPageNumberedPagination(basePage, title)) {
        allPages.push(title);
      }
    }

    continueToken = data?.continue?.apcontinue || null;
  } while (continueToken);

  return Array.from(new Set(allPages));
}
