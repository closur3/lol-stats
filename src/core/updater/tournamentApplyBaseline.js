import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { readExistingTournamentApplyState } from "../facts/tournamentApplyState.js";
import { assertActiveRuntimeMatchesConfig } from "./activeRuntimeValidator.js";

const ActiveRuntimePrefixes = [
  kvKeys.ActiveHomePrefix,
  kvKeys.ActiveLogPrefix,
  kvKeys.FandomRevisionPrefix,
  kvKeys.RawMatchesPrefix,
  kvKeys.ScheduleSessionsPrefix
];

async function listKeys(kv, prefix) {
  const names = [];
  let cursor;
  do {
    const options = cursor ? { prefix, cursor } : { prefix };
    const page = await kv.list(options);
    if (!page || !Array.isArray(page.keys) || typeof page.list_complete !== "boolean") {
      throw new Error(`KV list result invalid: ${prefix}`);
    }
    for (const key of page.keys) {
      if (!key || typeof key.name !== "string" || !key.name.startsWith(prefix)) {
        throw new Error(`KV list key invalid: ${prefix}`);
      }
      names.push(key.name);
    }
    if (page.list_complete) return names;
    if (typeof page.cursor !== "string" || !page.cursor) {
      throw new Error(`KV list cursor missing: ${prefix}`);
    }
    cursor = page.cursor;
  } while (true);
}

async function readActiveRuntimeSlugs(env) {
  const kv = env["lol-stats-kv"];
  const keyGroups = await Promise.all(ActiveRuntimePrefixes.map(prefix => listKeys(kv, prefix)));
  return new Set(keyGroups.flatMap((keys, index) => keys.map(key => key.slice(ActiveRuntimePrefixes[index].length))));
}

function assertKnownRuntimeSlugs(runtimeSlugs, activeTournaments) {
  const activeSlugs = new Set(activeTournaments.map(tournament => tournament.slug));
  const unknownSlugs = [...runtimeSlugs].filter(slug => !activeSlugs.has(slug)).sort();
  if (unknownSlugs.length > 0) {
    throw new Error(`TournamentApplyState missing with unknown Active runtime: ${unknownSlugs.join(",")}`);
  }
}

export async function resolveTournamentApplyBaseline(env, config, desiredApplyState) {
  const existingApplyState = await readExistingTournamentApplyState(env);
  if (existingApplyState) return { applyState: existingApplyState, checkpointPresent: true };

  const runtimeSlugs = await readActiveRuntimeSlugs(env);
  assertKnownRuntimeSlugs(runtimeSlugs, config.active);
  if (runtimeSlugs.size === 0) {
    return {
      applyState: { configDigest: "0".repeat(64), activeFingerprints: {} },
      checkpointPresent: false
    };
  }

  await assertActiveRuntimeMatchesConfig(env, config.active);
  return { applyState: desiredApplyState, checkpointPresent: false };
}
