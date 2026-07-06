export function normalizeOverviewPages(overviewPage) {
  return (Array.isArray(overviewPage) ? overviewPage : [overviewPage])
    .filter(page => typeof page === "string")
    .map(page => page.trim())
    .filter(Boolean);
}

export const toDataPage = (page) => page.startsWith("Data:") ? page : `Data:${page}`;

export function getFirstOverviewPage(overviewPage) {
  const pages = normalizeOverviewPages(overviewPage);
  return pages.length > 0 ? pages[0] : "";
}
