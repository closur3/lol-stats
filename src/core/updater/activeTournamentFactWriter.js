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
    if (!Array.isArray(rawMatches)) throw new Error(`RAW_MATCHES missing in write scope: ${slug}`);
    if (!analysis.tournamentMeta || typeof analysis.tournamentMeta !== "object" || Array.isArray(analysis.tournamentMeta)) {
      throw new Error("analysis.tournamentMeta must be a JSON object");
    }
    const meta = analysis.tournamentMeta[slug];
    if (!meta) throw new Error(`SCHEDULE_META missing in analysis: ${slug}`);
    await writeRawMatches(env, slug, rawMatches);
    await writeScheduleMeta(env, slug, meta);
  }));
}
