import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';
import { createSchemaIssue, describeSchemaValue } from '../facts/schemaIssue.js';
import { readTournamentStatisticsIssue } from '../facts/tournamentStatistics.js';
import { readTimeDistributionIssue } from '../facts/timeDistribution.js';
import { getOverviewPageNames } from '../../utils/data/overviewPages.js';

export function readActiveHomeIssue(home, tournament, artifactKey) {
  if (home == null) return createSchemaIssue({ artifactKey, path: "$", kind: "missing", expected: "stored JSON object" });
  if (typeof home !== "object" || Array.isArray(home)) return createSchemaIssue({ artifactKey, path: "$", kind: "invalid", expected: "JSON object", actual: describeSchemaValue(home) });
  const homeFields = Object.keys(home);
  const expectedFields = ["tournamentSlug", "statistics", "timeDistribution"];
  if (homeFields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(home, field))) {
    return createSchemaIssue({ artifactKey, path: "$", kind: "invalid", expected: "fields tournamentSlug, statistics, timeDistribution", actual: homeFields.length ? homeFields.join(", ") : "no fields" });
  }
  if (home.tournamentSlug !== tournament.slug) return createSchemaIssue({ artifactKey, path: "tournamentSlug", kind: "invalid", expected: tournament.slug, actual: describeSchemaValue(home.tournamentSlug) });
  const statisticsIssue = readTournamentStatisticsIssue(home.statistics, tournament, artifactKey);
  if (statisticsIssue) return statisticsIssue;
  const timeDistributionIssue = readTimeDistributionIssue(home.timeDistribution, artifactKey, getOverviewPageNames(tournament.overviewPages));
  if (timeDistributionIssue) return timeDistributionIssue;
  return null;
}

export async function inspectActiveHomes(env, tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const kv = env["lol-stats-kv"];
  const storedValues = await Promise.all(tournaments.map(tournament => kv.get(kvKeys.home(tournament.slug))));
  return storedValues.map((stored, index) => {
    const tournament = tournaments[index];
    const slug = tournament.slug;
    let activeHome = stored;
    if (typeof stored === "string") {
      try {
        activeHome = JSON.parse(stored);
      } catch {
        return {
          slug,
          activeHome: null,
          issue: createSchemaIssue({ artifactKey: kvKeys.home(slug), path: "$", kind: "invalid", expected: "stored JSON object", actual: "malformed JSON" })
        };
      }
    }
    return { slug, activeHome, issue: readActiveHomeIssue(activeHome, tournament, kvKeys.home(slug)) };
  });
}

export async function readActiveHomes(env, tournaments) {
  const entries = await inspectActiveHomes(env, tournaments);
  throwIfArtifactsUnavailable("ActiveHome", entries.flatMap(entry => entry.issue ? [entry.issue] : []));
  return entries.map(entry => entry.activeHome);
}

export async function readAvailableActiveHomes(env, tournaments) {
  const entries = await inspectActiveHomes(env, tournaments);
  return {
    activeHomes: entries.filter(entry => !entry.issue).map(entry => entry.activeHome),
    issues: entries.flatMap(entry => entry.issue ? [entry.issue] : [])
  };
}
