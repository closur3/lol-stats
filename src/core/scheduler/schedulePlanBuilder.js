import { timePolicy } from "../../utils/timePolicy.js";
import { assertScheduleMetaFields } from "../facts/scheduleMetaStore.js";
import {
  buildSlugScheduleState,
  buildIdleState,
  derivePhase,
  hasPlayWindow
} from "./scheduleState.js";

export function requireScheduleMeta(metasBySlug, slug) {
  const meta = metasBySlug.get(slug);
  if (!meta) throw new Error(`ScheduleMeta missing after load: ${slug}`);
  return meta;
}

function hasUnfinishedMatches(meta) {
  return meta.hasHistoryUnfinished || meta.todayUnfinished > 0;
}

function buildWindowFromMeta(meta) {
  const fields = assertScheduleMetaFields("ScheduleMeta", meta);
  if (!fields.hasHistoryUnfinished && !fields.todayEarliestTimestamp) return null;
  return {
    startHour: fields.hasHistoryUnfinished ? 0 : timePolicy.getBusinessHour(fields.todayEarliestTimestamp),
    endHour: 23
  };
}

function requirePlayWindow(slug, meta) {
  const window = buildWindowFromMeta(meta);
  if (!window) throw new Error(`Cannot restore play window for ${slug}`);
  return window;
}

export function buildNextSlugScheduleState(slug, slugState, meta, now) {
  if (!hasUnfinishedMatches(meta)) return buildSlugScheduleState("idle");
  const nextSlugState = hasPlayWindow(slugState)
    ? { ...slugState }
    : buildSlugScheduleState("idle", requirePlayWindow(slug, meta));
  nextSlugState.phase = derivePhase(nextSlugState, meta, now);
  return nextSlugState;
}

export function buildDailyScheduleState(tournaments, metasBySlug, now) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const today = timePolicy.getBusinessDateKey(now);
  const next = buildIdleState(today, tournaments);

  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) throw new Error("Tournament slug missing");
    const meta = requireScheduleMeta(metasBySlug, slug);
    if (!hasUnfinishedMatches(meta)) continue;
    const candidate = buildSlugScheduleState("idle", requirePlayWindow(slug, meta));
    candidate.phase = derivePhase(candidate, meta, now);
    next.slugStates[slug] = candidate;
  }

  return next;
}
