import { kvKeys } from '../../infrastructure/kv/keyFactory.js';

export async function commitRevisionWrites(env, pendingRevisionWrites) {
  if (!pendingRevisionWrites || typeof pendingRevisionWrites !== "object" || Array.isArray(pendingRevisionWrites)) {
    throw new Error("pendingRevisionWrites must be a JSON object");
  }
  const entries = Object.entries(pendingRevisionWrites);

  await Promise.all(entries.map(([slug, record]) => {
    if (!slug) throw new Error("FandomRevision slug missing");
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`FandomRevision record must be a JSON object: ${slug}`);
    }
    const fields = Object.keys(record);
    if (fields.length !== 1 || fields[0] !== "pages") throw new Error(`FandomRevision fields invalid: ${slug}`);
    if (!record.pages || typeof record.pages !== "object" || Array.isArray(record.pages)) {
      throw new Error(`FandomRevision pages invalid: ${slug}`);
    }
    for (const [title, revid] of Object.entries(record.pages)) {
      if (!title) throw new Error(`FandomRevision page title missing: ${slug}`);
      if (!Number.isInteger(revid) || revid <= 0) throw new Error(`FandomRevision revid invalid: ${slug}:${title}`);
    }
    return env["lol-stats-kv"].put(kvKeys.rev(slug), JSON.stringify(record));
  }));
}
