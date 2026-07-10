import { updateConfig } from '../core/updater/updateConfig.js';
import { readActiveConfig } from '../core/facts/tournamentConfigReader.js';
import { kvKeys } from '../infrastructure/kv/keyFactory.js';
import { renderLogPage } from '../render/templates/logs.js';
import { readRawMatches } from '../core/facts/rawMatchesStore.js';
import { readScheduleMeta } from '../core/facts/scheduleMetaStore.js';
import { readHasActiveCron } from '../core/scheduler/activeCronStatus.js';

async function readLogsBySlug(kv, slugs) {
  if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
  const logPairs = await Promise.all(slugs.map(async slug => {
    const logKey = kvKeys.log(slug);
    const logs = await readLogEntries(kv, logKey);
    return [slug, logs];
  }));
  return new Map(logPairs.filter(([, logs]) => Array.isArray(logs) && logs.length > 0));
}

async function readLogEntries(kv, logKey) {
  const logs = await kv.get(logKey, { type: "json" });
  if (logs == null) return [];
  if (!Array.isArray(logs)) throw new Error(`ActiveLog must be an array: ${logKey}`);
  return logs;
}

async function readLogMetaBySlug(env, slugs) {
  const metaPairs = await Promise.all(slugs.map(async slug => {
    const [rawMatches, meta] = await Promise.all([
      readRawMatches(env, slug),
      readScheduleMeta(env, slug)
    ]);
    return [slug, {
      totalMatchCount: rawMatches.length,
      todayEarliestTimestamp: meta.todayEarliestTimestamp,
      todayUnfinished: meta.todayUnfinished,
      hasHistoryUnfinished: meta.hasHistoryUnfinished
    }];
  }));
  return new Map(metaPairs);
}

function buildActiveLogItem(name, slug, logs, homeMeta) {
  if (!Array.isArray(logs)) throw new Error(`ActiveLog entries missing: ${slug}`);
  if (!homeMeta) throw new Error(`ActiveLog meta missing: ${slug}`);
  return {
    name,
    logs,
    totalMatches: homeMeta.totalMatchCount,
    todayEarliestTimestamp: homeMeta.todayEarliestTimestamp,
    todayUnfinished: homeMeta.todayUnfinished,
    hasHistoryUnfinished: homeMeta.hasHistoryUnfinished
  };
}

function buildActiveLogItems(tournaments, logsBySlug, homeBySlug) {
  const activeLogItems = [];

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug || !logsBySlug.has(slug)) continue;
    const logs = logsBySlug.get(slug);
    const name = logs[0]?.displayName;
    if (!name) throw new Error(`Missing displayName in ActiveLog entries: ${slug}`);
    activeLogItems.push(buildActiveLogItem(name, slug, logs, homeBySlug.get(slug)));
  }

  return activeLogItems;
}

export class LogsRouter {
  static async handleLogs(_request, env) {
    const kv = env["lol-stats-kv"];
    const tournaments = await readActiveConfig(env);
    const slugs = tournaments.map(tournament => tournament.slug);
    const logsBySlug = await readLogsBySlug(kv, slugs);
    const logSlugs = Array.from(logsBySlug.keys());
    const homeBySlug = await readLogMetaBySlug(env, logSlugs);
    const activeLogItems = buildActiveLogItems(tournaments, logsBySlug, homeBySlug);
    const hasActiveCron = await readHasActiveCron(env);
    const html = renderLogPage(activeLogItems, env.GITHUB_TIME, env.GITHUB_SHA, hasActiveCron, {
      maxLogEntries: updateConfig.maxLogEntries
    });

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate"
      }
    });
  }
}
