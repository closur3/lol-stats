import { renderArchiveFromFacts } from '../render/ssrRenderService.js';
import { renderArchiveErrorPage } from '../render/templates/error.js';
import { createNoCacheHtmlHeaders } from './htmlResponse.js';

export class ArchiveRouter {
  static async handleArchive(env) {
    try {
      const html = await renderArchiveFromFacts(env);
      return new Response(html, { headers: createNoCacheHtmlHeaders() });
    } catch (error) {
      console.error(`[ARCHIVE:RENDER] ${error.message}`);
      return new Response(renderArchiveErrorPage(error, env.GITHUB_TIME, env.GITHUB_SHA), {
        status: 500,
        headers: createNoCacheHtmlHeaders()
      });
    }
  }
}
