import { writeRawMatches } from "../facts/rawMatchesStore.js";
import { writeScheduleMeta } from "../facts/scheduleMetaStore.js";

export async function writeActiveTournamentFacts(env, tournaments, rawMatchesBySlug, analysis, writeScopeSlugs) {
  if (!Array.isArray(tournaments)) {
    throw new Error("tournaments must be an array");
  }
  await Promise.all(tournaments.map(async (tournament) => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    if (!writeScopeSlugs.has(slug)) return;
    const rawMatches = rawMatchesBySlug[slug];
    if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in write scope: ${slug}`);
    if (!analysis.scheduleMetaBySlug || typeof analysis.scheduleMetaBySlug !== "object" || Array.isArray(analysis.scheduleMetaBySlug)) {
      throw new Error("analysis.scheduleMetaBySlug must be a JSON object");
    }
    const meta = analysis.scheduleMetaBySlug[slug];
    if (!meta) throw new Error(`ScheduleMeta missing in analysis: ${slug}`);
    await writeRawMatches(env, slug, rawMatches);
    await writeScheduleMeta(env, slug, meta);
  }));
}
