import { createToolsAuthCookie, isAdminAuthorized, requirePost } from './api/auth.js';
import { renderToolsAuthPage, renderToolsPage } from '../render/templates/tools.js';
import { readArchiveConfig } from '../core/updater/archiveConfigReader.js';
import { readActiveConfig } from '../core/updater/activeConfigReader.js';
import { kvKeys } from '../infrastructure/kv/keyFactory.js';
import { IDLE_SWEEP_CRON } from '../core/scheduler/cronBuckets.js';

/**
 * 工具页面路由处理
 */
export class ToolsRouter {
  /**
   * 处理工具页面请求
   */
  static async handleTools(request, env) {
    try {
      if (!isAdminAuthorized(request, env)) {
        const html = renderToolsAuthPage(env.GITHUB_TIME, env.GITHUB_SHA);
        return new Response(html, {
          headers: { "content-type": "text/html;charset=utf-8" }
        });
      }

      // 并行读取活跃赛事、归档赛事、CRON 状态
      const [activeTournaments, archiveResult, activeCron] = await Promise.all([
      readActiveConfig(env),
      (async () => {
        try {
          return { archivedTournaments: await readArchiveConfig(env), archiveError: null };
        } catch (error) {
          return { archivedTournaments: [], archiveError: error.message };
        }
      })(),
      (async () => {
        const kv = env["lol-stats-kv"];
        const state = await kv.get(kvKeys.scheduleState(), { type: "json" });
        if (!state || !Array.isArray(state.schedules)) return false;
        return state.schedules.some(cron => cron !== IDLE_SWEEP_CRON);
      })()
      ]);

      const time = env.GITHUB_TIME;
      const sha = env.GITHUB_SHA;
      const html = renderToolsPage(
        time,
        sha,
        activeTournaments,
        archiveResult.archivedTournaments,
        archiveResult.archiveError,
        activeCron
      );

      return new Response(html, {
        headers: { "content-type": "text/html;charset=utf-8" }
      });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }

  static async handleToolsAuth(request, env) {
    const methodError = requirePost(request);
    if (methodError) return methodError;

    let payload;
    try {
      payload = await request.json();
    } catch (_error) {
      return new Response("Invalid JSON payload", { status: 400 });
    }

    const password = typeof payload?.password === "string" ? payload.password : "";
    if (!env.ADMIN_SECRET || password !== env.ADMIN_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    return new Response(null, {
      status: 204,
      headers: {
        "Set-Cookie": createToolsAuthCookie(request, env)
      }
    });
  }
}
