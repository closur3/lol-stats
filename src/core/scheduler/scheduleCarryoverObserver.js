import { buildScheduleCarryover } from "../analysis/scheduleCarryover.js";
import {
  readExistingScheduleCarryover,
  readScheduleCarryover,
  writeScheduleCarryover
} from "../facts/scheduleCarryoverStore.js";
import {
  ensureScheduleSessions,
  readExistingScheduleSessions
} from "../facts/scheduleSessionsStore.js";

function readTournaments(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const slugs = new Set();
  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    if (slugs.has(slug)) throw new Error(`Duplicate tournament slug: ${slug}`);
    slugs.add(slug);
  }
  return tournaments;
}

function buildObservation(scheduleSessions, previousCarryover, now) {
  const previous = previousCarryover === null ? null : { entries: previousCarryover.entries };
  return buildScheduleCarryover(previous, { sessions: scheduleSessions.sessions }, now);
}

async function writeObservations(env, observations) {
  await Promise.all(observations.map(({ slug, previousCarryover, carryover }) => {
    if (
      previousCarryover !== null
      && JSON.stringify(previousCarryover.entries) === JSON.stringify(carryover.entries)
    ) return null;
    return writeScheduleCarryover(env, slug, carryover);
  }));
  return new Map(observations.map(({ slug, carryover }) => [slug, carryover]));
}

export async function observeScheduleCarryovers(env, tournaments, now = new Date()) {
  const orderedTournaments = readTournaments(tournaments);
  const observations = await Promise.all(orderedTournaments.map(async tournament => {
    const slug = tournament.slug;
    const [scheduleSessions, previousCarryover] = await Promise.all([
      ensureScheduleSessions(env, tournament),
      readScheduleCarryover(env, slug)
    ]);
    return {
      slug,
      previousCarryover,
      carryover: buildObservation(scheduleSessions, previousCarryover, now)
    };
  }));
  return writeObservations(env, observations);
}

export async function observeExistingScheduleCarryovers(env, tournaments, now = new Date()) {
  const orderedTournaments = readTournaments(tournaments);
  const observations = await Promise.all(orderedTournaments.map(async tournament => {
    const slug = tournament.slug;
    const [scheduleSessions, previousCarryover] = await Promise.all([
      readExistingScheduleSessions(env, slug),
      readExistingScheduleCarryover(env, slug)
    ]);
    if (scheduleSessions === null) {
      if (previousCarryover !== null) {
        throw new Error(`ScheduleCarryover exists without ScheduleSessions: ${slug}`);
      }
      return null;
    }
    return {
      slug,
      previousCarryover,
      carryover: buildObservation(scheduleSessions, previousCarryover, now)
    };
  }));
  return writeObservations(env, observations.filter(Boolean));
}
