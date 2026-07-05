function readMetaNumber(meta, key) {
  const number = Number(meta[key]);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`Invalid ScheduleMeta ${key}`);
  }
  return number;
}

function readScheduleMetaPhaseInput(meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error("ScheduleMeta phase input must be a JSON object");
  }
  return {
    earliest: readMetaNumber(meta, "todayEarliestTimestamp"),
    unfinished: readMetaNumber(meta, "todayUnfinished"),
    historyUnfinished: meta.hasHistoryUnfinished === true
  };
}

const scheduleMetaPhaseDisplay = {
  play: { emoji: "🎮", text: "PLAY" },
  idle: { emoji: "⏳", text: "IDLE" },
  done: { emoji: "☑️", text: "DONE" },
  offday: { emoji: "⏸", text: "OFFDAY" }
};

export function resolveScheduleMetaPhase(meta, nowMs = Date.now()) {
  const { earliest, unfinished, historyUnfinished } = readScheduleMetaPhaseInput(meta);

  if (historyUnfinished) return "play";
  if (unfinished > 0) return earliest > 0 && nowMs < earliest ? "idle" : "play";
  if (earliest === 0) return "offday";
  return "done";
}

export function getScheduleMetaPhaseDisplay(phase) {
  const display = scheduleMetaPhaseDisplay[phase];
  if (!display) throw new Error(`Invalid ScheduleMeta phase: ${phase}`);
  return display;
}

export function resolveHomeEmojiFromScheduleMeta(meta, nowMs = Date.now()) {
  const phase = resolveScheduleMetaPhase(meta, nowMs);
  return getScheduleMetaPhaseDisplay(phase).emoji;
}
