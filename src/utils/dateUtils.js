export const dateUtils = {
  colorDate: (timestampInput) => {
    if (!timestampInput) return "#9ca3af";
    const diffDays = (Date.now() - timestampInput) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) return "hsl(215, 80%, 45%)";
    if (diffDays <= 3) return "hsl(215, 70%, 50%)";
    if (diffDays <= 7) return "hsl(215, 55%, 55%)";
    if (diffDays <= 14) return "hsl(215, 40%, 60%)";
    return "hsl(215, 40%, 60%)";
  },

  pruneScheduleMapByDayStatus: (scheduleMap, maxDays, todayStr, retainedPastDatesBySlug) => {
    if (!todayStr) throw new Error("todayStr is required");
    if (!scheduleMap || typeof scheduleMap !== "object" || Array.isArray(scheduleMap)) {
      throw new Error("scheduleMap must be a JSON object");
    }
    if (!Number.isInteger(maxDays) || maxDays < 1) throw new Error("maxDays must be a positive integer");
    if (!retainedPastDatesBySlug || typeof retainedPastDatesBySlug !== "object" || Array.isArray(retainedPastDatesBySlug)) {
      throw new Error("retainedPastDatesBySlug must be a JSON object");
    }
    const today = todayStr;
    const kept = {};

    Object.keys(scheduleMap).sort().forEach(date => {
      const matches = scheduleMap[date];
      if (!Array.isArray(matches)) throw new Error(`scheduleMap.${date} must be an array`);
      if (date >= today) {
        kept[date] = matches;
        return;
      }
      const shouldRetainDate = matches.some(match => retainedPastDatesBySlug[match?.slug]?.includes(date));
      if (shouldRetainDate) kept[date] = matches;
    });

    const limited = {};
    Object.keys(kept).sort().slice(0, maxDays).forEach(date => {
      limited[date] = kept[date];
    });
    return limited;
  }
};
