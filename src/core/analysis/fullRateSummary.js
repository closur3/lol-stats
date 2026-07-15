import { pct, rate } from '../../utils/data/stats.js';

function createFullRatePart(label, fullMatchCount, totalMatchCount) {
  return {
    label,
    fullMatchCount,
    totalMatchCount,
    percentText: pct(rate(fullMatchCount, totalMatchCount))
  };
}

export function summarizeFullRate(stats) {
  if (!Array.isArray(stats)) throw new Error("stats must be an array");

  let bo3FullMatchCount = 0;
  let bo3TotalMatchCount = 0;
  let bo5FullMatchCount = 0;
  let bo5TotalMatchCount = 0;

  stats.forEach(teamStats => {
    bo3FullMatchCount += teamStats.bestOf3FullMatchCount ?? 0;
    bo3TotalMatchCount += teamStats.bestOf3TotalMatchCount ?? 0;
    bo5FullMatchCount += teamStats.bestOf5FullMatchCount ?? 0;
    bo5TotalMatchCount += teamStats.bestOf5TotalMatchCount ?? 0;
  });

  bo3FullMatchCount /= 2;
  bo3TotalMatchCount /= 2;
  bo5FullMatchCount /= 2;
  bo5TotalMatchCount /= 2;

  const parts = [];
  if (bo3TotalMatchCount > 0) {
    parts.push(createFullRatePart("BO3", bo3FullMatchCount, bo3TotalMatchCount));
  }
  if (bo5TotalMatchCount > 0) {
    parts.push(createFullRatePart("BO5", bo5FullMatchCount, bo5TotalMatchCount));
  }

  return { parts };
}
