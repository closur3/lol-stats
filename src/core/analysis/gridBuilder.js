import { buildTimeSlotLayout } from './timeCluster.js';

function readGameResults(match, label) {
  if (!Object.hasOwn(match, "gameResults")) return null;
  if (!Array.isArray(match.gameResults) || match.gameResults.length === 0) throw new Error(`Time Grid game results invalid: ${label}`);
  for (const result of match.gameResults) {
    if (result !== "W" && result !== "L") {
      throw new Error(`Time Grid game result invalid: ${label}`);
    }
  }
  if (match.gameResults.filter(result => result === "W").length !== match.team1Score ||
      match.gameResults.filter(result => result === "L").length !== match.team2Score) {
    throw new Error(`Time Grid game results do not match score: ${label}`);
  }
  return [...match.gameResults];
}

export function buildTimeGridMatches(timeGridLayoutMatches, timeGridMatches) {
  const { clusters, assignmentByMatch } = buildTimeSlotLayout(timeGridLayoutMatches);
  return timeGridMatches.map(timeGridMatchInput => {
    const label = `${timeGridMatchInput.overviewPage}.${timeGridMatchInput.matchDateStr}`;
    const gameResults = readGameResults(timeGridMatchInput, label);
    const assignedClusterIndex = assignmentByMatch.get(timeGridMatchInput);
    if (assignedClusterIndex == null) throw new Error(`Time cluster assignment missing: ${label}`);
    const bestCluster = clusters[assignedClusterIndex];
    if (!bestCluster) throw new Error(`Time cluster missing: ${label}`);
    return {
      timeSlot: bestCluster.label,
      weekdayIndex: timeGridMatchInput.weekdayIndex,
      overviewPage: timeGridMatchInput.overviewPage,
      tabName: timeGridMatchInput.tabName,
      dateDisplay: timeGridMatchInput.dateDisplay,
      fullDateDisplay: timeGridMatchInput.fullDateDisplay,
      timestamp: timeGridMatchInput.timestamp,
      team1Name: timeGridMatchInput.team1Name,
      team2Name: timeGridMatchInput.team2Name,
      scoreDisplay: `${timeGridMatchInput.team1Score}-${timeGridMatchInput.team2Score}`,
      winner: timeGridMatchInput.winner,
      isForfeit: timeGridMatchInput.isForfeit,
      isFullLength: timeGridMatchInput.isFullLength,
      bestOf: timeGridMatchInput.bestOf,
      ...(gameResults === null ? {} : { gameResults }),
      ...(timeGridMatchInput.turnaroundType == null ? {} : { turnaroundType: timeGridMatchInput.turnaroundType })
    };
  });
}
