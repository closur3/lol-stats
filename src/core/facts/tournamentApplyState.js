import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

const DigestPattern = /^[a-f0-9]{64}$/;

function assertDigest(value, label) {
  if (typeof value !== "string" || !DigestPattern.test(value)) {
    throw new Error(`${label} must be a SHA-256 digest`);
  }
  return value;
}

function normalizeActiveFingerprints(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TournamentApplyState.activeFingerprints must be an object");
  }
  const fingerprints = {};
  for (const [slug, fingerprint] of Object.entries(value)) {
    if (!slug.trim()) throw new Error("TournamentApplyState active slug missing");
    fingerprints[slug] = assertDigest(fingerprint, `TournamentApplyState.activeFingerprints.${slug}`);
  }
  return fingerprints;
}

function normalizeApplyState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TournamentApplyState must be an object");
  }
  const fields = Object.keys(value);
  if (fields.length !== 2 || !Object.hasOwn(value, "configDigest") || !Object.hasOwn(value, "activeFingerprints")) {
    throw new Error("TournamentApplyState fields must be configDigest and activeFingerprints");
  }
  return {
    configDigest: assertDigest(value.configDigest, "TournamentApplyState.configDigest"),
    activeFingerprints: normalizeActiveFingerprints(value.activeFingerprints)
  };
}

export async function readExistingTournamentApplyState(env) {
  const value = await env["lol-stats-kv"].get(kvKeys.tournamentApplyState(), { type: "json" });
  if (value == null) return null;
  return normalizeApplyState(value);
}

export async function writeTournamentApplyState(env, state) {
  const normalized = normalizeApplyState(state);
  await env["lol-stats-kv"].put(kvKeys.tournamentApplyState(), JSON.stringify(normalized));
}
