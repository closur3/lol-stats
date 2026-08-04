export function renderRateBadge(teamName, tournamentName, bestOf, combinedStatsByName) {
  const teamStats = combinedStatsByName[tournamentName];
  if (!teamStats || !teamStats[teamName]) return "";

  const teamData = teamStats[teamName];
  let count = null, total = null;

  if (bestOf === 5) {
    count = teamData.bestOf5FullMatchCount;
    total = teamData.bestOf5TotalMatchCount;
  } else if (bestOf === 3) {
    count = teamData.bestOf3FullMatchCount;
    total = teamData.bestOf3TotalMatchCount;
  }

  if (count == null || !total) return "";
  const winRate = count / total;
  return `<span class="rate-hint">(${Math.round(winRate * 100)}%)</span>`;
}
