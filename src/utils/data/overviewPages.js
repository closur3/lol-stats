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

export function getOverviewPageLabel(overviewPage) {
  if (typeof overviewPage !== "string" || !overviewPage.trim()) throw new Error("overviewPage label source missing");
  const parts = overviewPage.split("/");
  return (parts[parts.length - 1] || overviewPage).replaceAll("_", " ");
}
