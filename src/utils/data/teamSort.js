import { sortPolicy } from '../sortPolicy.js';
import { rate } from './stats.js';

export function sortTeams(statsObj) {
  if (!statsObj) return [];
  const statsArray = Object.values(statsObj).filter(teamStats => teamStats && teamStats.name && teamStats.name !== "TBD");
  const priorMean = sortPolicy.getWeightedPriorMean(statsArray);

  return statsArray.sort((leftTeamStats, rightTeamStats) => {
    const { weightedFullMatchCount: leftWeightedFullMatchCount, weightedTotalMatchCount: leftWeightedTotalMatchCount } = sortPolicy.getTeamWeightedCounts(leftTeamStats);
    const { weightedFullMatchCount: rightWeightedFullMatchCount, weightedTotalMatchCount: rightWeightedTotalMatchCount } = sortPolicy.getTeamWeightedCounts(rightTeamStats);

    const leftFullRate = leftWeightedTotalMatchCount > 0 ? leftWeightedFullMatchCount / leftWeightedTotalMatchCount : 2.0;
    const rightFullRate = rightWeightedTotalMatchCount > 0 ? rightWeightedFullMatchCount / rightWeightedTotalMatchCount : 2.0;
    if (leftFullRate !== rightFullRate) return leftFullRate - rightFullRate;

    const leftBayesRate = sortPolicy.bayesPosteriorRate(leftWeightedFullMatchCount, leftWeightedTotalMatchCount, priorMean, sortPolicy.bayesPriorStrength);
    const rightBayesRate = sortPolicy.bayesPosteriorRate(rightWeightedFullMatchCount, rightWeightedTotalMatchCount, priorMean, sortPolicy.bayesPriorStrength);
    if (leftBayesRate !== rightBayesRate) return leftBayesRate - rightBayesRate;

    if (leftWeightedTotalMatchCount !== rightWeightedTotalMatchCount) return rightWeightedTotalMatchCount - leftWeightedTotalMatchCount;

    const leftSeriesWinRate = rate(leftTeamStats.seriesWinCount, leftTeamStats.seriesTotalMatchCount) || 0;
    const rightSeriesWinRate = rate(rightTeamStats.seriesWinCount, rightTeamStats.seriesTotalMatchCount) || 0;
    if (leftSeriesWinRate !== rightSeriesWinRate) return rightSeriesWinRate - leftSeriesWinRate;

    const gameDiff = (rate(rightTeamStats.gameWinCount, rightTeamStats.gameTotalCount) || 0) - (rate(leftTeamStats.gameWinCount, leftTeamStats.gameTotalCount) || 0);
    if (gameDiff !== 0) return gameDiff;

    return String(leftTeamStats.name || "").localeCompare(String(rightTeamStats.name || ""));
  });
}
