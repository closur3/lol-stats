import { renderArchiveFromFacts } from '../render/ssrRenderService.js';
import { renderArchiveErrorPage } from '../render/templates/error.js';

export class ArchiveRouter {
  static htmlHeaders() {
    return {
      "content-type": "text/html;charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache",
      expires: "0"
    };
  }

  static async handleArchive(request, env) {
    try {
      const html = await renderArchiveFromFacts(env);
      return new Response(html, { headers: ArchiveRouter.htmlHeaders() });
    } catch (error) {
      console.error(`[ARCHIVE:RENDER] ${error.message}`);
      return new Response(renderArchiveErrorPage(error, env.GITHUB_TIME, env.GITHUB_SHA), {
        status: 500,
        headers: ArchiveRouter.htmlHeaders()
      });
    }
  }
}
