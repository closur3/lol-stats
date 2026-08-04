import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

function normalizeName(tournamentName) {
  if (typeof tournamentName !== "string" || !tournamentName.trim()) {
    throw new Error("Active tournament tournamentName required");
  }
  return tournamentName.trim();
}

export async function deleteActiveRuntimeFacts(env, tournamentName) {
  const cleanName = normalizeName(tournamentName);
  const kv = env["lol-stats-kv"];
  await Promise.all([
    kv.delete(kvKeys.active(cleanName)),
    kv.delete(kvKeys.log(cleanName)),
    kv.delete(kvKeys.rev(cleanName)),
    kv.delete(kvKeys.rawMatches(cleanName)),
    kv.delete(kvKeys.scheduleSessions(cleanName))
  ]);
}
