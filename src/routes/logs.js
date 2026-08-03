import { updateConfig } from '../core/updater/updateConfig.js';
import { readTournamentConfig } from '../core/facts/tournamentConfigReader.js';
import { kvKeys } from '../infrastructure/kv/keyFactory.js';
import { renderLogPage } from '../render/templates/logs.js';
import { readRawMatches } from '../core/facts/rawMatchesStore.js';
import { readScheduleSessions } from '../core/facts/scheduleSessionsStore.js';
import { readCronInfo } from '../core/scheduler/cronInfo.js';
import { normalizeActiveLogEntries } from '../core/facts/activeLog.js';
import { createSchemaIssue } from '../core/facts/schemaIssue.js';
import { renderDataErrorPage } from '../render/templates/error.js';
import { createNoCacheHtmlHeaders } from './htmlResponse.js';

async function readLogsBySlug(kv, slugs) {
  if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
  const logPairs = await Promise.all(slugs.map(async slug => {
    const logKey = kvKeys.log(slug);
    const result = await inspectLogEntries(kv, logKey);
    return { slug, ...result };
  }));
  return {
    logsBySlug: new Map(logPairs
      .filter(result => !result.issue && result.logs.length > 0)
      .map(result => [result.slug, result.logs])),
    issues: logPairs.flatMap(result => result.issue ? [result.issue] : [])
  };
}

async function inspectLogEntries(kv, logKey) {
  const stored = await kv.get(logKey);
  if (stored == null) return { logs: [], issue: null };

  let logs = stored;
  if (typeof stored === "string") {
    try {
      logs = JSON.parse(stored);
    } catch {
      return {
        logs: [],
        issue: createSchemaIssue({
          artifactKey: logKey,
          path: "$",
          kind: "invalid",
          expected: "stored JSON array of current ActiveLog entries",
          actual: "malformed JSON"
        })
      };
    }
  }

  try {
    return { logs: normalizeActiveLogEntries(logs, logKey), issue: null };
  } catch (error) {
    return {
      logs: [],
      issue: createSchemaIssue({
        artifactKey: logKey,
        path: "$",
        kind: "invalid",
        expected: "array of current ActiveLog entries",
        actual: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function readLogMetaBySlug(env, slugs) {
  const metaPairs = await Promise.all(slugs.map(async slug => {
    const [rawMatches, scheduleSessions] = await Promise.all([
      readRawMatches(env, slug),
      readScheduleSessions(env, slug)
    ]);
    return [slug, {
      totalMatchCount: rawMatches.length,
      scheduleSessions: { sessions: scheduleSessions.sessions }
    }];
  }));
  return new Map(metaPairs);
}

function buildActiveLogItem(tournament, logs, homeMeta) {
  const { slug, name, leagueShort } = tournament;
  if (!Array.isArray(logs)) throw new Error(`ActiveLog entries missing: ${slug}`);
  if (!homeMeta) throw new Error(`ActiveLog meta missing: ${slug}`);
  return {
    name,
    leagueShort,
    logs,
    totalMatches: homeMeta.totalMatchCount,
    scheduleSessions: homeMeta.scheduleSessions
  };
}

function buildActiveLogItems(tournaments, logsBySlug, homeBySlug) {
  const activeLogItems = [];

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug || !logsBySlug.has(slug)) continue;
    const logs = logsBySlug.get(slug);
    activeLogItems.push(buildActiveLogItem(tournament, logs, homeBySlug.get(slug)));
  }

  return activeLogItems;
}

export class LogsRouter {
  static async handleLogs(_request, env) {
    try {
      const kv = env["lol-stats-kv"];
      const { active: tournaments } = await readTournamentConfig(env);
      const slugs = tournaments.map(tournament => tournament.slug);
      const logResult = await readLogsBySlug(kv, slugs);
      const logSlugs = Array.from(logResult.logsBySlug.keys());
      const homeBySlug = await readLogMetaBySlug(env, logSlugs);
      const activeLogItems = buildActiveLogItems(tournaments, logResult.logsBySlug, homeBySlug);
      const cronInfo = await readCronInfo(env);
      const html = renderLogPage(activeLogItems, env.GITHUB_TIME, env.GITHUB_SHA, cronInfo, {
        maxLogEntries: updateConfig.maxLogEntries,
        issues: logResult.issues
      });

      return new Response(html, { headers: createNoCacheHtmlHeaders() });
    } catch (error) {
      console.error(`[LOGS:RENDER] ${error.message}`);
      return new Response(renderDataErrorPage(error, env.GITHUB_TIME, env.GITHUB_SHA, {
        dataLabel: "Logs",
        navMode: "logs",
        retryHref: "/logs"
      }), {
        status: 500,
        headers: createNoCacheHtmlHeaders()
      });
    }
  }
}
