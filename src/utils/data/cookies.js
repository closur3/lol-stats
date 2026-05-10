export function extractCookies(headers) {
  if (!headers) return "";
  if (typeof headers.getSetCookie === 'function') {
    const cookies = headers.getSetCookie();
    if (cookies && cookies.length > 0) {
      return cookies.map(cookie => cookie.split(';')[0].trim()).join('; ');
    }
  }
  const headerVal = headers.get("set-cookie");
  if (!headerVal) return "";
  return headerVal.split(/,(?=\s*[A-Za-z0-9_]+=[^;]+)/)
    .map(cookie => cookie.split(';')[0].trim())
    .filter(cookie => cookie.includes('='))
    .join('; ');
}
