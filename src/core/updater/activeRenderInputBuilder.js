import { readScheduleSessions } from "../facts/scheduleSessionsStore.js";

export async function readScheduleSessionsMap(env, orderedTournaments) {
  if (!Array.isArray(orderedTournaments)) throw new Error("orderedTournaments must be an array");
  const pairs = await Promise.all(orderedTournaments.map(async tournament => {
    const tournamentName = tournament?.name;
    if (!tournamentName) throw new Error("Tournament tournamentName missing");
    return [tournamentName, await readScheduleSessions(env, tournamentName)];
  }));
  return new Map(pairs);
}

export function buildActiveRenderInput(snapshots, orderedTournaments) {
  if (!Array.isArray(snapshots)) throw new Error("snapshots must be an array");
  if (!Array.isArray(orderedTournaments)) throw new Error("orderedTournaments must be an array");
  if (snapshots.length !== orderedTournaments.length) throw new Error("ActiveSnapshot count does not match tournaments");
  const statisticsByName = {};
  const timeDistributionByName = {};

  snapshots.forEach((snapshot, index) => {
    const tournamentName = snapshot?.tournamentName;
    if (!tournamentName) throw new Error("ActiveSnapshot tournamentName missing");
    if (orderedTournaments[index]?.name !== tournamentName) throw new Error(`ActiveSnapshot order mismatch: ${tournamentName}`);
    statisticsByName[tournamentName] = snapshot.statistics;
    timeDistributionByName[tournamentName] = snapshot.timeDistribution;
  });

  return { tournaments: orderedTournaments, statisticsByName, timeDistributionByName };
}
