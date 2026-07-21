import { buildCronsFromScheduleState } from "./cronBuckets.js";
import { runScheduleApply } from "./scheduleApplyRunner.js";
import {
  areCronsApplied,
  readScheduleState,
  recordAppliedCrons,
  writeScheduleState
} from "./scheduleState.js";

export async function deleteScheduleControl(env, slug, scheduleOptions) {
  const state = await readScheduleState(env);
  if (!state) return;
  const controlChanged = Object.hasOwn(state.controlsBySlug, slug);
  if (controlChanged) delete state.controlsBySlug[slug];

  const crons = buildCronsFromScheduleState(state);
  let appliedChanged = false;
  if (!areCronsApplied(state, crons)) {
    const applyResult = await runScheduleApply(env, crons, "DELETE_ACTIVE", scheduleOptions);
    if (applyResult === "applied") {
      recordAppliedCrons(state, crons);
      appliedChanged = true;
    }
  }
  if (controlChanged || appliedChanged) await writeScheduleState(env, state);
}
