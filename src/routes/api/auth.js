const toolsAuthCookie = "ToolsAuth";

function readCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return "";
  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
}

export function createToolsAuthCookie(request, env) {
  const secret = env.ADMIN_SECRET;
  if (!secret) throw new Error("ADMIN_SECRET missing");
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${toolsAuthCookie}=${encodeURIComponent(secret)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure}`;
}

function isToolsCookieAuthorized(request, env) {
  return readCookie(request, toolsAuthCookie) === env.ADMIN_SECRET;
}

export function isAdminAuthorized(request, env) {
  const expectedSecret = env.ADMIN_SECRET;
  if (!expectedSecret) return false;
  const authHeader = request.headers.get("Authorization");
  if (authHeader === `Bearer ${expectedSecret}`) return true;
  return isToolsCookieAuthorized(request, env);
}

export function requireAdmin(request, env) {
  return isAdminAuthorized(request, env) ? null : new Response("Unauthorized", { status: 401 });
}

export function requirePost(request) {
  return request.method !== "POST" ? new Response("Method Not Allowed", { status: 405 }) : null;
}
