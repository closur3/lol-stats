export function buildScheduleMap(allFutureMatches) {
  const scheduleMap = {};
  const sortedFutureDates = Object.keys(allFutureMatches).sort();
  sortedFutureDates.forEach(date => {
    const matches = allFutureMatches[date];
    if (!Array.isArray(matches)) throw new Error(`future matches must be an array: ${date}`);
    scheduleMap[date] = [...matches].sort((matchA, matchB) => {
      const matchATournamentIndex = matchA.tournamentIndex;
      const matchBTournamentIndex = matchB.tournamentIndex;
      if (matchATournamentIndex !== matchBTournamentIndex) return matchATournamentIndex - matchBTournamentIndex;
      return matchA.time.localeCompare(matchB.time);
    });
  });

  return scheduleMap;
}
