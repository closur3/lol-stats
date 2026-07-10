import { renderHomeFromFacts } from '../render/ssrRenderService.js';
import { createNoCacheHtmlHeaders } from './htmlResponse.js';

export class HomeRouter {
  static async handleHome(env) {
    const html = await renderHomeFromFacts(env);
    if (!html) {
      return new Response(
        "Home is not ready yet. <a href='/tools'>Go to Tools</a>.",
        { headers: createNoCacheHtmlHeaders() }
      );
    }
    return new Response(html, { headers: createNoCacheHtmlHeaders() });
  }
}
