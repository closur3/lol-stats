import { HTMLRenderer } from '../render/htmlRenderer.js';
import { GitHubClient } from '../api/githubClient.js';
import { loadArchiveConfig } from '../core/updater/archiveIndex.js';
import { loadTourConfig } from '../core/updater/tourConfigLoader.js';
import { dateUtils } from '../utils/dateUtils.js';
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
      // 并行读取活跃赛事、归档赛事、CRON 状态
      const [activeTournaments, archiveResult, activeCron] = await Promise.all([
      (async () => {
        const githubClient = new GitHubClient(env);
        const tournaments = await loadTourConfig(env, githubClient);
        return dateUtils.sortTournamentsByDate(tournaments);
      })(),
      (async () => {
        try {
          const githubClient = new GitHubClient(env);
          return { archivedTournaments: await loadArchiveConfig(env, githubClient), archiveError: null };
        } catch (error) {
          return { archivedTournaments: [], archiveError: error.message };
        }
      })(),
      (async () => {
        const kv = env["lol-stats-kv"];
        const state = await kv.get(kvKeys.scheduleDay(), { type: "json" });
        if (!state || !Array.isArray(state.schedules)) return false;
        return state.schedules.some(cron => cron !== IDLE_SWEEP_CRON);
      })()
      ]);

      const time = env.GITHUB_TIME;
      const sha = env.GITHUB_SHA;
      const html = HTMLRenderer.renderToolsPage(
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
}
