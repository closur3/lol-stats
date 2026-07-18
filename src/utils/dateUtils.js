export const dateUtils = {
  colorDate: (timestampInput) => {
    if (!timestampInput) return "#9ca3af";
    const diffDays = (Date.now() - timestampInput) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) return "hsl(215, 80%, 45%)";
    if (diffDays <= 3) return "hsl(215, 70%, 50%)";
    if (diffDays <= 7) return "hsl(215, 55%, 55%)";
    if (diffDays <= 14) return "hsl(215, 40%, 60%)";
    return "hsl(215, 40%, 60%)";
  }
};
