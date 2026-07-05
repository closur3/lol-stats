import { timePolicy } from "../../utils/timePolicy.js";
import {
  buildLeagueState,
  buildIdleState,
  derivePhase,
  hasPlayWindow
} from "./scheduleState.js";
import { buildWindowFromMeta } from "./scheduleDiscovery.js";

export function requireScheduleMeta(metasBySlug, slug) {
  const meta = metasBySlug.get(slug);
  if (!meta) throw new Error(`SCHEDULE_META missing after load: ${slug}`);
  return meta;
}

export function hasUnfinishedMatches(meta) {
  return meta.hasHistoryUnfinished || meta.todayUnfinished > 0;
}

export function requirePlayWindow(slug, meta) {
  const window = buildWindowFromMeta(meta);
  if (!window) throw new Error(`Cannot restore play window for ${slug}`);
  return window;
}

export function buildNextLeagueState(slug, leagueState, meta, now) {
  if (!hasUnfinishedMatches(meta)) return buildLeagueState("idle");
  const nextLeagueState = hasPlayWindow(leagueState)
    ? { ...leagueState }
    : buildLeagueState("idle", requirePlayWindow(slug, meta));
  nextLeagueState.phase = derivePhase(nextLeagueState, meta, now);
  return nextLeagueState;
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
    const candidate = buildLeagueState("idle", requirePlayWindow(slug, meta));
    candidate.phase = derivePhase(candidate, meta, now);
    next.leagues[slug] = candidate;
  }

  return next;
}
