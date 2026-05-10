import { requireAdmin, requirePost } from "./auth.js";
import { rebuildStaticPagesFromCache } from "./staticPages.js";

export async function handleRefreshUI(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const result = await rebuildStaticPagesFromCache(env);
  if (!result.ok) {
    const status = result.reason === "NO_CACHE" ? 400 : 500;
    return new Response(result.message, { status });
  }

  return new Response(
    `OK homes=${result.homes} writes=${result.writes} home=${result.homeChanged ? "updated" : "same"} archive=${result.archiveChanged ? "updated" : "same"}`,
    { status: 200 }
  );
}
