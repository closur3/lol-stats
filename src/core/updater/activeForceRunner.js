import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { assertRawMatches } from "../facts/rawMatchesStore.js";
import { rebuildSchedule } from "../scheduler/scheduleMaintenanceRunner.js";
import { prepareActiveUpdate } from "./activeUpdatePreparer.js";
import { detectRevisionChanges } from "./revisionDetector.js";
import { commitRevisionWrites } from "./revWriter.js";
import { commitActiveLogWrites } from "./logPersistence.js";
import { commitActiveUpdate } from "./activeUpdateCommitter.js";
import { rejectActiveUpdate } from "./activeUpdateRejection.js";

function assertForceInputs(activeTournaments, requestedNames) {
  if (!Array.isArray(activeTournaments)) throw new Error("activeTournaments must be an array");
  if (!(requestedNames instanceof Set) || requestedNames.size === 0) {
    throw new Error("requestedNames must be a nonempty Set");
  }
  for (const tournamentName of requestedNames) {
    if (typeof tournamentName !== "string" || !tournamentName) throw new Error("Force tournamentName missing");
  }
}

async function inspectRawMatches(env, activeTournaments, requestedNames) {
  const kv = env["lol-stats-kv"];
  const rawMatchesByName = {};
  const rebuildNames = new Set(requestedNames);

  await Promise.all(activeTournaments.map(async tournament => {
    const tournamentName = tournament?.name;
    if (!tournamentName) throw new Error("Tournament tournamentName missing");
    if (requestedNames.has(tournamentName)) {
      rawMatchesByName[tournamentName] = null;
      return;
    }

    let stored;
    try {
      stored = await kv.get(kvKeys.rawMatches(tournamentName));
    } catch (error) {
      throw new Error(`Force RawMatches read failed: ${tournamentName}`, { cause: error });
    }
    if (stored === null) {
      console.log(`[FORCE:REPAIR] missing RawMatches ${tournamentName}`);
      rawMatchesByName[tournamentName] = null;
      rebuildNames.add(tournamentName);
      return;
    }

    try {
      const rawMatches = typeof stored === "string" ? JSON.parse(stored) : stored;
      assertRawMatches(tournamentName, rawMatches);
      rawMatchesByName[tournamentName] = rawMatches;
    } catch (error) {
      console.error(`[FORCE:REPAIR] invalid RawMatches ${tournamentName}: ${error.message}`);
      rawMatchesByName[tournamentName] = null;
      rebuildNames.add(tournamentName);
    }
  }));

  return { rawMatchesByName, rebuildNames };
}

export async function forceActiveTournaments(env, activeTournaments, requestedNames, scheduledTimeMs, scheduleOptions) {
  assertForceInputs(activeTournaments, requestedNames);
  const activeNames = new Set(activeTournaments.map(tournament => tournament.name));
  if (requestedNames.size > activeNames.size || [...requestedNames].some(tournamentName => !activeNames.has(tournamentName))) {
    throw new Error("Force scope contains a tournament outside TournamentConfig.active");
  }

  const { rawMatchesByName, rebuildNames } = await inspectRawMatches(env, activeTournaments, requestedNames);
  const reasonsByName = new Map([...rebuildNames].map(tournamentName => [tournamentName, "force"]));
  const rebuildTournaments = activeTournaments.filter(tournament => rebuildNames.has(tournament.name));
  const { revidChanges, pendingRevisionWrites } = await detectRevisionChanges(env, rebuildTournaments);
  const activeUpdatePlan = await prepareActiveUpdate(env, activeTournaments, rawMatchesByName, rebuildNames, {
    reasonsByName,
    rebuild: true,
    revidChanges
  });
  if (!activeUpdatePlan.accepted) await rejectActiveUpdate(env, activeUpdatePlan);
  await commitActiveUpdate(env, activeUpdatePlan);
  await rebuildSchedule(env, activeTournaments, scheduledTimeMs, scheduleOptions);
  await commitRevisionWrites(env, pendingRevisionWrites);
  await commitActiveLogWrites(env, activeUpdatePlan.activeLogWrites);
}
