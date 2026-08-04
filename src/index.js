import { ActiveRouter } from './routes/active.js';
import { ArchiveRouter } from './routes/archive.js';
import { ToolsRouter } from './routes/tools.js';
import { LogsRouter } from './routes/logs.js';
import { handleForceUpdate } from './routes/api/force.js';
import { handleRebuildArchive } from './routes/api/archiveActions.js';
import { handleRunCron } from './routes/api/runCron.js';
import { handleReconcileTournaments } from './routes/api/reconcileTournaments.js';
import { logActionResponse } from './routes/api/actionResponseLogger.js';
import { runCron } from './core/cron/orchestrator.js';

/**
 * 主Worker入口
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/":
        return ActiveRouter.handleActive(env);
      
      case "/archive":
        return ArchiveRouter.handleArchive(env);
      
      case "/tools":
        return ToolsRouter.handleTools(request, env);

      case "/tools/auth":
        return ToolsRouter.handleToolsAuth(request, env);
      
      case "/force":
        return logActionResponse("FORCE", await handleForceUpdate(request, env));
      
      case "/rebuild-archive":
        return logActionResponse("ARCHIVE_REBUILD", await handleRebuildArchive(request, env));

      case "/run-cron":
        return logActionResponse("CRON", await handleRunCron(request, env));

      case "/reconcile-tournaments":
        return logActionResponse("TOURNAMENT_RECONCILE", await handleReconcileTournaments(request, env));

      case "/logs":
        return LogsRouter.handleLogs(request, env);
      
      case "/favicon.ico":
        return new Response(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='.9em' font-size='85' text-anchor='middle'>🥇</text></svg>`, {
          headers: { "content-type": "image/svg+xml" }
        });
      
      default: 
        return new Response("404 Not Found", { status: 404 });
    }
  },

  async scheduled(event, env) {
    await runCron(env, event);
  }
};
