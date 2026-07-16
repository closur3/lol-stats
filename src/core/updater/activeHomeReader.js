import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';
import { createSchemaIssue, describeSchemaValue } from '../facts/schemaIssue.js';

function readActiveHomeIssue(home, artifactKey) {
  if (home == null) return createSchemaIssue({ artifactKey, path: "$", kind: "missing", expected: "stored JSON object" });
  if (typeof home !== "object" || Array.isArray(home)) return createSchemaIssue({ artifactKey, path: "$", kind: "invalid", expected: "JSON object", actual: describeSchemaValue(home) });
  if (!home.tournament || typeof home.tournament !== "object" || Array.isArray(home.tournament)) return createSchemaIssue({ artifactKey, path: "tournament", kind: "invalid", expected: "object", actual: describeSchemaValue(home.tournament) });
  if (typeof home.tournament.slug !== "string" || !home.tournament.slug) return createSchemaIssue({ artifactKey, path: "tournament.slug", kind: "invalid", expected: "non-empty string", actual: describeSchemaValue(home.tournament.slug) });
  if (Object.hasOwn(home, "teamMap")) return createSchemaIssue({ artifactKey, path: "teamMap", kind: "invalid", expected: "field absent in current schema", actual: "present" });
  if (Object.hasOwn(home.tournament, "teamMap")) return createSchemaIssue({ artifactKey, path: "tournament.teamMap", kind: "invalid", expected: "field absent in current schema", actual: "present" });
  if (!home.stats || typeof home.stats !== "object" || Array.isArray(home.stats)) return createSchemaIssue({ artifactKey, path: "stats", kind: "invalid", expected: "object", actual: describeSchemaValue(home.stats) });
  if (!home.timeGrid || typeof home.timeGrid !== "object" || Array.isArray(home.timeGrid)) return createSchemaIssue({ artifactKey, path: "timeGrid", kind: "invalid", expected: "object", actual: describeSchemaValue(home.timeGrid) });
  if (!home.scheduleMap || typeof home.scheduleMap !== "object" || Array.isArray(home.scheduleMap)) return createSchemaIssue({ artifactKey, path: "scheduleMap", kind: "invalid", expected: "object", actual: describeSchemaValue(home.scheduleMap) });
  return null;
}

export async function readActiveHomes(env, slugs) {
  if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
  const kv = env["lol-stats-kv"];
  const activeHomes = await Promise.all(slugs.map(slug => kv.get(kvKeys.home(slug), { type: "json" })));
  const issues = activeHomes.flatMap((activeHome, index) => {
    const issue = readActiveHomeIssue(activeHome, kvKeys.home(slugs[index]));
    return issue ? [issue] : [];
  });
  throwIfArtifactsUnavailable("ActiveHome", issues);
  return activeHomes;
}
