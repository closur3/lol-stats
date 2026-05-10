export function isUnauthorized(request, env) {
  const expectedSecret = env.ADMIN_SECRET;
  if (!expectedSecret) return true;
  const authHeader = request.headers.get("Authorization");
  return !authHeader || authHeader !== `Bearer ${expectedSecret}`;
}

export function requireAdmin(request, env) {
  return isUnauthorized(request, env) ? new Response("Unauthorized", { status: 401 }) : null;
}

export function requirePost(request) {
  return request.method !== "POST" ? new Response("Method Not Allowed", { status: 405 }) : null;
}
