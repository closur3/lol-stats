import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { throwIfArtifactsUnavailable } from './artifactAvailability.js';

function readActiveHomeIssue(home) {
  if (!home || typeof home !== "object" || Array.isArray(home)) return "Invalid ActiveHome";
  if (!home.tournament || typeof home.tournament !== "object" || !home.tournament.slug) return "Invalid tournament";
  if (Object.hasOwn(home, "teamMap") || Object.hasOwn(home.tournament, "teamMap")) return "Legacy team map";
  if (!home.stats || typeof home.stats !== "object" || Array.isArray(home.stats)) return "Invalid stats";
  if (!home.timeGrid || typeof home.timeGrid !== "object" || Array.isArray(home.timeGrid)) return "Invalid time grid";
  if (!home.scheduleMap || typeof home.scheduleMap !== "object" || Array.isArray(home.scheduleMap)) return "Invalid schedule map";
  return null;
}

export async function readActiveHomes(env, slugs) {
  if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
  const kv = env["lol-stats-kv"];
  const activeHomes = await Promise.all(slugs.map(slug => kv.get(kvKeys.home(slug), { type: "json" })));
  const issues = activeHomes.flatMap((activeHome, index) => {
    const reason = activeHome == null ? "Missing ActiveHome" : readActiveHomeIssue(activeHome);
    return reason ? [{ slug: slugs[index], reason }] : [];
  });
  throwIfArtifactsUnavailable("ActiveHome", issues);
  return activeHomes;
}
