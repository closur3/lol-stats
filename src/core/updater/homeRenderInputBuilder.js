import { readScheduleSessions } from "../facts/scheduleSessionsStore.js";

export async function readScheduleSessionsMap(env, orderedTournaments) {
  if (!Array.isArray(orderedTournaments)) throw new Error("orderedTournaments must be an array");
  const pairs = await Promise.all(orderedTournaments.map(async tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    return [slug, await readScheduleSessions(env, slug)];
  }));
  return new Map(pairs);
}

export function buildHomeRenderInput(homeEntries, orderedTournaments) {
  if (!Array.isArray(homeEntries)) throw new Error("homeEntries must be an array");
  if (!Array.isArray(orderedTournaments)) throw new Error("orderedTournaments must be an array");
  if (homeEntries.length !== orderedTournaments.length) throw new Error("ActiveHome count does not match tournaments");
  const statisticsBySlug = {};
  const timeDistributionBySlug = {};

  homeEntries.forEach((home, index) => {
    const slug = home?.tournamentSlug;
    if (!slug) throw new Error("ActiveHome tournamentSlug missing");
    if (orderedTournaments[index]?.slug !== slug) throw new Error(`ActiveHome order mismatch: ${slug}`);
    statisticsBySlug[slug] = home.statistics;
    timeDistributionBySlug[slug] = home.timeDistribution;
  });

  return { tournaments: orderedTournaments, statisticsBySlug, timeDistributionBySlug };
}
