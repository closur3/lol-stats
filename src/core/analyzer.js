import { buildTeamNameResolver } from './analysis/teamResolver.js';
import { buildTournamentStatistics } from './analysis/tournamentStatistics.js';
import { buildTimeGridMatches } from './analysis/gridBuilder.js';

export function analyzeTournaments(rawMatchesByName, tournaments) {
    if (!Array.isArray(tournaments)) {
      throw new Error("tournaments must be an array");
    }
    const statisticsByName = {};
    const timeDistributionByName = {};

    tournaments.forEach(tournament => {
      const rawMatches = rawMatchesByName[tournament.name];
      if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in analyzer input: ${tournament.name}`);

      const resolveTeamName = buildTeamNameResolver(tournament.teamMap);
      const { statistics, timeGridLayoutMatches, timeGridMatches } = buildTournamentStatistics(rawMatches, tournament, resolveTeamName);

      statisticsByName[tournament.name] = statistics;

      timeDistributionByName[tournament.name] = buildTimeGridMatches(timeGridLayoutMatches, timeGridMatches);
    });

    return {
      statisticsByName,
      timeDistributionByName
    };
}
