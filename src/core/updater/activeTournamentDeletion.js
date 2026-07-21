import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { deleteScheduleControl } from "../scheduler/scheduleControlDeletion.js";

function normalizeSlug(slug) {
  if (typeof slug !== "string" || !slug.trim()) {
    throw new Error("Active tournament slug required");
  }
  return slug.trim();
}

export async function deleteActiveRuntimeFacts(env, slug) {
  const cleanSlug = normalizeSlug(slug);
  const kv = env["lol-stats-kv"];
  await Promise.all([
    kv.delete(kvKeys.home(cleanSlug)),
    kv.delete(kvKeys.log(cleanSlug)),
    kv.delete(kvKeys.rev(cleanSlug)),
    kv.delete(kvKeys.rawMatches(cleanSlug)),
    kv.delete(kvKeys.scheduleSessions(cleanSlug))
  ]);
}

export async function deleteActiveRuntimeState(env, slug, scheduleOptions) {
  const cleanSlug = normalizeSlug(slug);
  if (!scheduleOptions || typeof scheduleOptions !== "object" || Array.isArray(scheduleOptions)) {
    throw new Error("scheduleOptions must be a JSON object");
  }
  await deleteActiveRuntimeFacts(env, cleanSlug);
  await deleteScheduleControl(env, cleanSlug, scheduleOptions);

  return { deletedSlug: cleanSlug };
}
