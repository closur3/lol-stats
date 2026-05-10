export function isOffDayMeta(meta) {
  const earliest = Number(meta?.todayEarliestTimestamp) || 0;
  const unfinished = Number(meta?.todayUnfinished) || 0;
  const historyUnfinished = !!meta?.hasHistoryUnfinished;
  return earliest === 0 && unfinished === 0 && !historyUnfinished;
}

export function resolveLeaguePhase(meta, nowMs = Date.now()) {
  const earliest = Number(meta?.todayEarliestTimestamp) || 0;
  const unfinished = Number(meta?.todayUnfinished) || 0;
  const historyUnfinished = !!meta?.hasHistoryUnfinished;

  if (historyUnfinished) return "play";
  if (unfinished > 0) return earliest > 0 && nowMs < earliest ? "idle" : "play";
  if (earliest === 0) return "offday";
  return "idle";
}

export function resolveLogsPhaseLabel(meta, nowMs = Date.now()) {
  const phase = resolveLeaguePhase(meta, nowMs);
  if (phase === "play") return "🎮PLAY";
  if (phase === "offday") return "🕊️OFFDAY";
  return "⏳IDLE";
}

export function resolveHomeEmojiByPhase(meta, nowMs = Date.now()) {
  const phase = resolveLeaguePhase(meta, nowMs);
  if (phase === "play") return "🎮";
  if (phase === "offday") return "🕊️";
  return "⏳";
}
