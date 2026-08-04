import { renderActiveFromFacts } from '../render/ssrRenderService.js';
import { renderDataErrorPage } from '../render/templates/error.js';
import { createNoCacheHtmlHeaders } from './htmlResponse.js';

export class ActiveRouter {
  static async handleActive(env) {
    try {
      const html = await renderActiveFromFacts(env);
      if (!html) throw new Error("Active render returned no content");
      return new Response(html, { headers: createNoCacheHtmlHeaders() });
    } catch (error) {
      console.error(`[ACTIVE:RENDER] ${error.message}`);
      return new Response(renderDataErrorPage(error, env.GITHUB_TIME, env.GITHUB_SHA, {
        dataLabel: "Active",
        navMode: "active",
        retryHref: "/"
      }), {
        status: 500,
        headers: createNoCacheHtmlHeaders()
      });
    }
  }
}
