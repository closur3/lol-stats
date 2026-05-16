import { renderHomeFromFacts } from '../render/ssrRenderService.js';

export class HomeRouter {
  static htmlHeaders() {
    return {
      "content-type": "text/html;charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache",
      expires: "0"
    };
  }

  static async handleHome(request, env) {
    const html = await renderHomeFromFacts(env);
    if (!html) {
      return new Response(
        "Home is not ready yet. <a href='/tools'>Go to Tools</a>.",
        { headers: HomeRouter.htmlHeaders() }
      );
    }
    return new Response(html, { headers: HomeRouter.htmlHeaders() });
  }
}
