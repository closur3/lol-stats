export function createNoCacheHtmlHeaders() {
  return {
    "content-type": "text/html;charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
    pragma: "no-cache",
    expires: "0"
  };
}
