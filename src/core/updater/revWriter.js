import { kvKeys } from '../../infrastructure/kv/keyFactory.js';

export async function commitRevisionWrites(env, pendingRevisionWrites) {
  if (!pendingRevisionWrites || typeof pendingRevisionWrites !== "object" || Array.isArray(pendingRevisionWrites)) {
    throw new Error("pendingRevisionWrites must be a JSON object");
  }
  const entries = Object.entries(pendingRevisionWrites);

  await Promise.all(entries.map(([tournamentName, record]) => {
    if (!tournamentName) throw new Error("FandomRevision tournamentName missing");
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`FandomRevision record must be a JSON object: ${tournamentName}`);
    }
    const fields = Object.keys(record);
    if (fields.length !== 1 || fields[0] !== "pages") throw new Error(`FandomRevision fields invalid: ${tournamentName}`);
    if (!record.pages || typeof record.pages !== "object" || Array.isArray(record.pages)) {
      throw new Error(`FandomRevision pages invalid: ${tournamentName}`);
    }
    for (const [title, revid] of Object.entries(record.pages)) {
      if (!title) throw new Error(`FandomRevision page title missing: ${tournamentName}`);
      if (!Number.isInteger(revid) || revid <= 0) throw new Error(`FandomRevision revid invalid: ${tournamentName}:${title}`);
    }
    return env["lol-stats-kv"].put(kvKeys.rev(tournamentName), JSON.stringify(record));
  }));
}
