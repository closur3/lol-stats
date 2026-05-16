import { renderArchiveFromFacts } from '../render/ssrRenderService.js';

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
    const html = await renderArchiveFromFacts(env);
    return new Response(html, { headers: ArchiveRouter.htmlHeaders() });
  }
}
