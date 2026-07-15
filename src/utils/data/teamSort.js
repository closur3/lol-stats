import { sortPolicy } from '../sortPolicy.js';
import { rate } from './stats.js';

function compareNames(leftTeamStats, rightTeamStats) {
  return leftTeamStats.name.localeCompare(rightTeamStats.name);
}

function readFallbackRateTier(rateValue) {
  if (rateValue === null) return 1;
  return rateValue > 0 ? 0 : 2;
}

function compareFallbackRates(leftRate, rightRate) {
  const tierDifference = readFallbackRateTier(leftRate) - readFallbackRateTier(rightRate);
  if (tierDifference !== 0) return tierDifference;
  if (leftRate === null) return 0;
  return rightRate - leftRate;
}

function readSeriesRate(teamStats) {
  return rate(teamStats.seriesWinCount, teamStats.seriesTotalMatchCount);
}

function readGameRate(teamStats) {
  return rate(teamStats.gameWinCount, teamStats.gameTotalCount);
}

function compareTeamStats(leftTeamStats, rightTeamStats, priorMean) {
  const leftCounts = sortPolicy.getTeamWeightedCounts(leftTeamStats);
  const rightCounts = sortPolicy.getTeamWeightedCounts(rightTeamStats);
  const leftFullRate = leftCounts.weightedTotalMatchCount > 0
    ? leftCounts.weightedFullMatchCount / leftCounts.weightedTotalMatchCount
    : 2;
  const rightFullRate = rightCounts.weightedTotalMatchCount > 0
    ? rightCounts.weightedFullMatchCount / rightCounts.weightedTotalMatchCount
    : 2;
  if (leftFullRate !== rightFullRate) return leftFullRate - rightFullRate;

  const leftBayesRate = sortPolicy.bayesPosteriorRate(
    leftCounts.weightedFullMatchCount,
    leftCounts.weightedTotalMatchCount,
    priorMean,
    sortPolicy.bayesPriorStrength
  );
  const rightBayesRate = sortPolicy.bayesPosteriorRate(
    rightCounts.weightedFullMatchCount,
    rightCounts.weightedTotalMatchCount,
    priorMean,
    sortPolicy.bayesPriorStrength
  );
  if (leftBayesRate !== rightBayesRate) return leftBayesRate - rightBayesRate;

  if (leftCounts.weightedTotalMatchCount !== rightCounts.weightedTotalMatchCount) {
    return rightCounts.weightedTotalMatchCount - leftCounts.weightedTotalMatchCount;
  }

  const seriesRateDifference = compareFallbackRates(
    readSeriesRate(leftTeamStats),
    readSeriesRate(rightTeamStats)
  );
  if (seriesRateDifference !== 0) return seriesRateDifference;

  const gameRateDifference = compareFallbackRates(
    readGameRate(leftTeamStats),
    readGameRate(rightTeamStats)
  );
  if (gameRateDifference !== 0) return gameRateDifference;
  return compareNames(leftTeamStats, rightTeamStats);
}

export function sortTeams(statsObj) {
  if (!statsObj || typeof statsObj !== "object" || Array.isArray(statsObj)) {
    throw new Error("team stats must be a JSON object");
  }
  const statsArray = Object.values(statsObj).filter(teamStats => teamStats && teamStats.name && teamStats.name !== "TBD");
  const priorMean = sortPolicy.getWeightedPriorMean(statsArray);
  return statsArray.sort((leftTeamStats, rightTeamStats) => (
    compareTeamStats(leftTeamStats, rightTeamStats, priorMean)
  ));
}
