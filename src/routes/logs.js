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

async function readLogsByName(kv, names) {
  if (!Array.isArray(names)) throw new Error("names must be an array");
  const logPairs = await Promise.all(names.map(async tournamentName => {
    const logKey = kvKeys.log(tournamentName);
    const result = await inspectLogEntries(kv, logKey);
    return { tournamentName, ...result };
  }));
  return {
    logsByName: new Map(logPairs
      .filter(result => !result.issue && result.logs.length > 0)
      .map(result => [result.tournamentName, result.logs])),
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

async function readLogMetaByName(env, names) {
  const metaPairs = await Promise.all(names.map(async tournamentName => {
    const [rawMatches, scheduleSessions] = await Promise.all([
      readRawMatches(env, tournamentName),
      readScheduleSessions(env, tournamentName)
    ]);
    return [tournamentName, {
      totalMatchCount: rawMatches.length,
      scheduleSessions: { sessions: scheduleSessions.sessions }
    }];
  }));
  return new Map(metaPairs);
}

function buildActiveLogItem(tournament, logs, activeMeta) {
  const { name, leagueShort } = tournament;
  const tournamentName = name;
  if (!Array.isArray(logs)) throw new Error(`ActiveLog entries missing: ${tournamentName}`);
  if (!activeMeta) throw new Error(`ActiveLog meta missing: ${tournamentName}`);
  return {
    name,
    leagueShort,
    logs,
    totalMatches: activeMeta.totalMatchCount,
    scheduleSessions: activeMeta.scheduleSessions
  };
}

function buildActiveLogItems(tournaments, logsByName, activeByName) {
  const activeLogItems = [];

  for (const tournament of tournaments) {
    const tournamentName = tournament?.name;
    if (!tournamentName || !logsByName.has(tournamentName)) continue;
    const logs = logsByName.get(tournamentName);
    activeLogItems.push(buildActiveLogItem(tournament, logs, activeByName.get(tournamentName)));
  }

  return activeLogItems;
}

export class LogsRouter {
  static async handleLogs(_request, env) {
    try {
      const kv = env["lol-stats-kv"];
      const { active: tournaments } = await readTournamentConfig(env);
      const names = tournaments.map(tournament => tournament.name);
      const logResult = await readLogsByName(kv, names);
      const logNames = Array.from(logResult.logsByName.keys());
      const activeByName = await readLogMetaByName(env, logNames);
      const activeLogItems = buildActiveLogItems(tournaments, logResult.logsByName, activeByName);
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
