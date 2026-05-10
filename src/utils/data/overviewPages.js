export function normalizeOverviewPages(overviewPage) {
  return (Array.isArray(overviewPage) ? overviewPage : [overviewPage])
    .filter(page => typeof page === "string")
    .map(page => page.trim())
    .filter(Boolean);
}

export const toDataPage = (page) => page.startsWith("Data:") ? page : `Data:${page}`;

export function parseOverviewPages(overviewPage) {
  let pages = overviewPage;
  if (typeof pages === 'string') {
    const trimmed = pages.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        pages = JSON.parse(trimmed);
      } catch (_error) {
        pages = trimmed.split(',').map(page => page.trim()).filter(page => page.length > 0);
      }
    } else {
      pages = trimmed.split(',').map(page => page.trim()).filter(page => page.length > 0);
    }
  } else if (!Array.isArray(pages)) {
    pages = [pages];
  }
  return pages
    .map(page => typeof page === "string" ? page.trim() : "")
    .filter(Boolean);
}

export function getFirstOverviewPage(overviewPage) {
  const pages = normalizeOverviewPages(overviewPage);
  return pages.length > 0 ? pages[0] : "";
}
