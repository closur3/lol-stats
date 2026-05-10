import { HTMLRenderer } from "../../render/htmlRenderer.js";
import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { requireAdmin } from "./auth.js";

export async function handleBackup(request, env) {
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const payload = {};
  const kv = env["lol-stats-kv"];
  const allHomeKeys = await kv.list({ prefix: kvKeys.HOME_PREFIX });
  const dataKeys = allHomeKeys.keys.map(key => key.name).filter(keyName => keyName !== kvKeys.homeStatic());
  const rawHomes = await Promise.all(dataKeys.map(key => env["lol-stats-kv"].get(key, { type: "json" })));

  rawHomes.forEach(home => {
    const homeTournament = home?.tournament;
    if (home && homeTournament && home.stats) {
      const slug = homeTournament.slug;
      payload[`markdown/${slug}.md`] = HTMLRenderer.generateMarkdown(
        homeTournament,
        home.stats,
        { [slug]: home.timeGrid || {} }
      );
    }
  });

  if (Object.keys(payload).length === 0) {
    return new Response(JSON.stringify({ error: "No data" }), {
      status: 503,
      headers: { "content-type": "application/json" }
    });
  }
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" }
  });
}
