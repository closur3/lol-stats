import { renderArchiveFromFacts } from '../render/ssrRenderService.js';
import { renderDataErrorPage } from '../render/templates/error.js';
import { createNoCacheHtmlHeaders } from './htmlResponse.js';

export class ArchiveRouter {
  static async handleArchive(env) {
    try {
      const html = await renderArchiveFromFacts(env);
      return new Response(html, { headers: createNoCacheHtmlHeaders() });
    } catch (error) {
      console.error(`[ARCHIVE:RENDER] ${error.message}`);
      return new Response(renderDataErrorPage(error, env.GITHUB_TIME, env.GITHUB_SHA, {
        dataLabel: "Archive",
        navMode: "archive",
        retryHref: "/archive"
      }), {
        status: 500,
        headers: createNoCacheHtmlHeaders()
      });
    }
  }
}
