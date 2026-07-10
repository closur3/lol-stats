import { renderHomeFromFacts } from '../render/ssrRenderService.js';
import { renderDataErrorPage } from '../render/templates/error.js';
import { createNoCacheHtmlHeaders } from './htmlResponse.js';

export class HomeRouter {
  static async handleHome(env) {
    try {
      const html = await renderHomeFromFacts(env);
      if (!html) throw new Error("Home render returned no content");
      return new Response(html, { headers: createNoCacheHtmlHeaders() });
    } catch (error) {
      console.error(`[HOME:RENDER] ${error.message}`);
      return new Response(renderDataErrorPage(error, env.GITHUB_TIME, env.GITHUB_SHA, {
        dataLabel: "Home",
        navMode: "home",
        retryHref: "/"
      }), {
        status: 500,
        headers: createNoCacheHtmlHeaders()
      });
    }
  }
}
