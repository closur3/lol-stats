import { writeRawMatches } from "../facts/rawMatchesStore.js";
import { writeScheduleSessions } from "../facts/scheduleSessionsStore.js";

export async function writeActiveTournamentFacts(env, tournaments, rawMatchesBySlug, scheduleSessionsBySlug, writeScopeSlugs) {
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }
  await Promise.all(tournaments.map(async (tournament) => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    if (!writeScopeSlugs.has(slug)) return;
    const rawMatches = rawMatchesBySlug[slug];
    if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in write scope: ${slug}`);
    const scheduleSessions = scheduleSessionsBySlug[slug];
    if (!scheduleSessions) throw new Error(`ScheduleSessions missing in write scope: ${slug}`);
    await writeRawMatches(env, slug, rawMatches);
    await writeScheduleSessions(env, slug, scheduleSessions);
  }));
}
