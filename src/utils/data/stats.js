export const rate = (numerator, denominator) => denominator > 0 ? numerator / denominator : null;
export const pct = (rateValue) => rateValue !== null ? `${Math.round(rateValue * 100)}%` : "-";

export function color(rateValue, reverse = false) {
  if (rateValue === null) return "#f1f5f9";
  const normalizedRate = Math.max(0, Math.min(1, rateValue));
  const hue = reverse ? (1 - normalizedRate) * 140 : normalizedRate * 140;
  return `hsl(${parseInt(hue)}, 55%, 50%)`;
}
