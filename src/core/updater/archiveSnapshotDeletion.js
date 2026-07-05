import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { rebuildArchiveIndexFromSnapshots } from "./archiveIndex.js";

export async function deleteArchiveSnapshot(env, slug) {
  const existing = await env["lol-stats-kv"].get(kvKeys.archive(slug), { type: "json" });
  if (!existing) throw new Error(`ARCHIVE snapshot missing: ${slug}`);
  await env["lol-stats-kv"].delete(kvKeys.archive(slug));
  await rebuildArchiveIndexFromSnapshots(env, { allowEmpty: true });
}
