import { writeHomeSnapshots } from "../projection/homeProjector.js";
import { writeRawMatches } from "../facts/rawMatchesStore.js";
import { writeScheduleSessions } from "../facts/scheduleSessionsStore.js";

function assertAcceptedPlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan) || plan.accepted !== true) {
    throw new Error("Accepted active update plan required");
  }
  const expectedFields = [
    "accepted",
    "rawMatchesBySlug",
    "scheduleSessionsBySlug",
    "homeSnapshotsBySlug",
    "activeLogWrites"
  ];
  const fields = Object.keys(plan);
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(plan, field))) {
    throw new Error("Accepted active update plan fields invalid");
  }
}

async function writePhase(env, valuesBySlug, label, writer) {
  if (!valuesBySlug || typeof valuesBySlug !== "object" || Array.isArray(valuesBySlug)) {
    throw new Error(`${label} must be a JSON object`);
  }
  await Promise.all(Object.entries(valuesBySlug).map(([slug, value]) => {
    if (!slug) throw new Error(`${label} slug missing`);
    return writer(env, slug, value);
  }));
}

export async function commitActiveUpdate(env, plan) {
  assertAcceptedPlan(plan);
  await writePhase(env, plan.rawMatchesBySlug, "RawMatches writes", writeRawMatches);
  await writePhase(env, plan.scheduleSessionsBySlug, "ScheduleSessions writes", writeScheduleSessions);
  await writeHomeSnapshots(env, plan.homeSnapshotsBySlug);
}
