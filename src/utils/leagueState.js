function readMetaNumber(meta, key) {
  const number = Number(meta[key]);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`Invalid league meta ${key}`);
  }
  return number;
}

function readLeagueMeta(meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error("league meta must be a JSON object");
  }
  return {
    earliest: readMetaNumber(meta, "todayEarliestTimestamp"),
    unfinished: readMetaNumber(meta, "todayUnfinished"),
    historyUnfinished: meta.hasHistoryUnfinished === true
  };
}

const LEAGUE_PHASE_DISPLAY = {
  play: { emoji: "🎮", text: "PLAY" },
  idle: { emoji: "⏳", text: "IDLE" },
  done: { emoji: "☑️", text: "DONE" },
  offday: { emoji: "⏸", text: "OFFDAY" }
};

export function resolveLeaguePhase(meta, nowMs = Date.now()) {
  const { earliest, unfinished, historyUnfinished } = readLeagueMeta(meta);

  if (historyUnfinished) return "play";
  if (unfinished > 0) return earliest > 0 && nowMs < earliest ? "idle" : "play";
  if (earliest === 0) return "offday";
  return "done";
}

export function getLeaguePhaseDisplay(phase) {
  const display = LEAGUE_PHASE_DISPLAY[phase];
  if (!display) throw new Error(`Invalid league phase: ${phase}`);
  return display;
}

export function resolveHomeEmojiByPhase(meta, nowMs = Date.now()) {
  const phase = resolveLeaguePhase(meta, nowMs);
  return getLeaguePhaseDisplay(phase).emoji;
}
