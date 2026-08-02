import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import {
  readExistingTournamentApplyState,
  TournamentApplyStateSchemaError
} from "../facts/tournamentApplyState.js";

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

function assertKnownRuntimeSlugs(runtimeSlugs, config) {
  const configuredSlugs = new Set([...config.active, ...config.archive].map(tournament => tournament.slug));
  const unknownSlugs = [...runtimeSlugs].filter(slug => !configuredSlugs.has(slug)).sort();
  if (unknownSlugs.length > 0) {
    throw new Error(`TournamentApplyState missing with unknown Active runtime: ${unknownSlugs.join(",")}`);
  }
}

function buildRecoveryApplyState(runtimeSlugs) {
  return {
    configDigest: "0".repeat(64),
    activeFingerprints: Object.fromEntries([...runtimeSlugs].sort().map(slug => [slug, "0".repeat(64)]))
  };
}

export async function resolveTournamentApplyBaseline(env, config) {
  let existingApplyState;
  try {
    existingApplyState = await readExistingTournamentApplyState(env);
  } catch (error) {
    if (!(error instanceof TournamentApplyStateSchemaError)) throw error;
    console.error(`[TOURNAMENT:CHECKPOINT] replacing invalid TournamentApplyState: ${error.message}`);
    existingApplyState = null;
  }
  if (existingApplyState) return existingApplyState;

  const runtimeSlugs = await readActiveRuntimeSlugs(env);
  assertKnownRuntimeSlugs(runtimeSlugs, config);
  return buildRecoveryApplyState(runtimeSlugs);
}
