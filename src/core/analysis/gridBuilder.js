import { timeGridColumnCount } from '../../constants/index.js';
import { buildTimeSlotLayout } from './timeCluster.js';

export function buildTournamentTimeGrid(tournamentSlug, timeGridMatches, timeGrid) {
  const { clusters, assignmentByMatch } = buildTimeSlotLayout(timeGridMatches);

  const createSlot = () => {
    const slot = {};
    for (let dayIndex = 0; dayIndex < timeGridColumnCount; dayIndex++) {
      slot[dayIndex] = { totalMatchCount: 0, fullLengthMatchCount: 0, matches: [] };
    }
    return slot;
  };

  if (!timeGrid[tournamentSlug]) timeGrid[tournamentSlug] = { "Total": createSlot() };

  for (const cluster of clusters) {
    if (!timeGrid[tournamentSlug][cluster.label]) {
      timeGrid[tournamentSlug][cluster.label] = createSlot();
    }
  }

  for (const timeGridMatchInput of timeGridMatches) {
    const timeGridMatch = {
      dateDisplay: timeGridMatchInput.dateDisplay,
      fullDateDisplay: timeGridMatchInput.fullDateDisplay,
      timestamp: timeGridMatchInput.timestamp,
      team1Name: timeGridMatchInput.team1Name,
      team2Name: timeGridMatchInput.team2Name,
      scoreDisplay: `${timeGridMatchInput.team1Score}-${timeGridMatchInput.team2Score}`,
      winner: timeGridMatchInput.winner,
      isForfeit: timeGridMatchInput.isForfeit,
      isFullLength: timeGridMatchInput.isFullLength,
      bestOf: timeGridMatchInput.bestOf
    };

    const assignedClusterIndex = assignmentByMatch.get(timeGridMatchInput);
    if (assignedClusterIndex == null) throw new Error(`Time cluster assignment missing: ${tournamentSlug}.${timeGridMatchInput.matchDateStr}`);
    const bestCluster = clusters[assignedClusterIndex];
    if (!bestCluster) throw new Error(`Time cluster missing: ${tournamentSlug}.${timeGridMatchInput.matchDateStr}`);

    const dayIndex = timeGridMatchInput.weekdayIndex;
    const addMatchToSlot = (tournamentTimeGrid, timeSlotLabel, targetDayIndex) => {
      tournamentTimeGrid[timeSlotLabel][targetDayIndex].totalMatchCount++;
      if (timeGridMatchInput.isFullLength) tournamentTimeGrid[timeSlotLabel][targetDayIndex].fullLengthMatchCount++;
      tournamentTimeGrid[timeSlotLabel][targetDayIndex].matches.push(timeGridMatch);
    };
    addMatchToSlot(timeGrid[tournamentSlug], bestCluster.label, dayIndex);
    addMatchToSlot(timeGrid[tournamentSlug], "Total", dayIndex);
    addMatchToSlot(timeGrid[tournamentSlug], bestCluster.label, 7);
    addMatchToSlot(timeGrid[tournamentSlug], "Total", 7);
  }
}
