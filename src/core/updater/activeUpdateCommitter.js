import { writeActiveSnapshots } from "../projection/activeProjector.js";
import { writeRawMatches } from "../facts/rawMatchesStore.js";
import { writeScheduleSessions } from "../facts/scheduleSessionsStore.js";

function assertAcceptedPlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan) || plan.accepted !== true) {
    throw new Error("Accepted active update plan required");
  }
  const expectedFields = [
    "accepted",
    "rawMatchesByName",
    "scheduleSessionsByName",
    "activeSnapshotsByName",
    "activeLogWrites"
  ];
  const fields = Object.keys(plan);
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(plan, field))) {
    throw new Error("Accepted active update plan fields invalid");
  }
}

async function writePhase(env, valuesByName, label, writer) {
  if (!valuesByName || typeof valuesByName !== "object" || Array.isArray(valuesByName)) {
    throw new Error(`${label} must be a JSON object`);
  }
  await Promise.all(Object.entries(valuesByName).map(([tournamentName, value]) => {
    if (!tournamentName) throw new Error(`${label} tournamentName missing`);
    return writer(env, tournamentName, value);
  }));
}

export async function commitActiveUpdate(env, plan) {
  assertAcceptedPlan(plan);
  await writePhase(env, plan.rawMatchesByName, "RawMatches writes", writeRawMatches);
  await writePhase(env, plan.scheduleSessionsByName, "ScheduleSessions writes", writeScheduleSessions);
  await writeActiveSnapshots(env, plan.activeSnapshotsByName);
}
