import { readScheduleSessions } from "../facts/scheduleSessionsStore.js";
import { readScheduleState } from "../scheduler/scheduleState.js";

export async function readScheduleSessionsMap(env, orderedTournaments) {
  if (!Array.isArray(orderedTournaments)) throw new Error("orderedTournaments must be an array");
  const pairs = await Promise.all(orderedTournaments.map(async tournament => {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    return [slug, await readScheduleSessions(env, slug)];
  }));
  return new Map(pairs);
}

export async function readHomeScheduleFacts(env, orderedTournaments) {
  if (!Array.isArray(orderedTournaments)) throw new Error("orderedTournaments must be an array");
  const [pairs, scheduleState] = await Promise.all([
    Promise.all(orderedTournaments.map(async tournament => {
      const slug = tournament?.slug;
      if (!slug) throw new Error("Tournament slug missing");
      return [slug, await readScheduleSessions(env, slug)];
    })),
    readScheduleState(env)
  ]);
  if (scheduleState === null) throw new Error("ScheduleState missing");
  return {
    scheduleSessionsMap: new Map(pairs),
    scheduleState
  };
}

export function buildHomeRenderInput(homeEntries, orderedTournaments) {
  if (!Array.isArray(homeEntries)) throw new Error("homeEntries must be an array");
  if (!Array.isArray(orderedTournaments)) throw new Error("orderedTournaments must be an array");
  if (homeEntries.length !== orderedTournaments.length) throw new Error("ActiveHome count does not match tournaments");
  const globalStats = {};
  const timeGrid = {};

  homeEntries.forEach((home, index) => {
    const slug = home?.tournament?.slug;
    if (!slug) throw new Error("ActiveHome tournament slug missing");
    if (orderedTournaments[index]?.slug !== slug) throw new Error(`ActiveHome order mismatch: ${slug}`);
    globalStats[slug] = home.stats;
    timeGrid[slug] = home.timeGrid;
  });

  return { tournaments: orderedTournaments, globalStats, timeGrid };
}
