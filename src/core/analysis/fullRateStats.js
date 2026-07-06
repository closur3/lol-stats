import { pct, rate } from '../../utils/data/stats.js';

export function generateFullRateString(bo3FullMatches, bo3TotalMatches, bo5FullMatches, bo5TotalMatches) {
  if (bo3TotalMatches === 0 && bo5TotalMatches === 0) return "";

  let parts = [];
  if (bo3TotalMatches > 0) {
    parts.push(`BO3: **${bo3FullMatches}/${bo3TotalMatches}** (${pct(rate(bo3FullMatches, bo3TotalMatches))})`);
  }
  if (bo5TotalMatches > 0) {
    parts.push(`BO5: **${bo5FullMatches}/${bo5TotalMatches}** (${pct(rate(bo5FullMatches, bo5TotalMatches))})`);
  }
  return parts.join(" | ");
}
