import { timePolicy } from '../../utils/timePolicy.js';
import { parseMatchBestOf, parseMatchForfeitSide, parseMatchIsNullified, parseMatchScore, parseMatchWinner, validateMatchOutcome } from './matchFields.js';

export function parseAllMatches(rawMatches, resolveName, todayStr, tournamentSlug, tournamentLeagueShort, tournamentIndex, allFutureMatches) {
  const parsedMatches = [];
  const scheduleMeta = {
    todayEarliestTimestamp: 0,
    todayUnfinished: 0,
    hasHistoryUnfinished: false
  };
  const allStatsInit = {
    bestOf3FullMatchCount: 0, bestOf3TotalMatchCount: 0,
    bestOf5FullMatchCount: 0, bestOf5TotalMatchCount: 0,
    seriesWinCount: 0, seriesTotalMatchCount: 0,
    gameWinCount: 0, gameTotalCount: 0,
    winStreakCount: 0, lossStreakCount: 0,
    last: 0, history: []
  };

  const stats = {};

  const ensureTeam = (teamName) => {
    if (!stats[teamName]) {
      stats[teamName] = { name: teamName, ...JSON.parse(JSON.stringify(allStatsInit)) };
    }
  };

  rawMatches.forEach(match => {
    const team1Name = resolveName(match.Team1);
    const team2Name = resolveName(match.Team2);
    if (!team1Name || !team2Name) { return; }

    const matchLabel = `${tournamentSlug}.${match.MatchId}`;
    const team1Score = parseMatchScore(match.Team1Score, `${tournamentSlug}.${match.MatchId}.Team1Score`);
    const team2Score = parseMatchScore(match.Team2Score, `${tournamentSlug}.${match.MatchId}.Team2Score`);
    const bestOf = parseMatchBestOf(match.BestOf, `${tournamentSlug}.${match.MatchId}.BestOf`);
    const winner = parseMatchWinner(match.Winner, `${tournamentSlug}.${match.MatchId}.Winner`);
    const forfeitSide = parseMatchForfeitSide(match.FF, `${matchLabel}.FF`);
    const isNullified = parseMatchIsNullified(match.IsNullified, `${matchLabel}.IsNullified`);
    validateMatchOutcome(winner, forfeitSide, isNullified, matchLabel);
    if (isNullified) return;

    ensureTeam(team1Name);
    ensureTeam(team2Name);

    const isFinished = winner !== null;
    const isForfeit = forfeitSide !== null;
    const isLive = !isFinished && (team1Score > 0 || team2Score > 0 || (match.Team1Score !== "" && match.Team1Score != null));
    const isFullLength = !isForfeit && ((bestOf === 3 && Math.min(team1Score, team2Score) === 1) || (bestOf === 5 && Math.min(team1Score, team2Score) === 2));

    const matchTime = timePolicy.deriveMatchTime(match.DateTimeUTC);
    const {
      dateDisplay,
      fullDateDisplay,
      matchDateStr,
      matchTimeStr,
      timestamp,
      weekdayIndex,
      timeMinutes,
      roundedMinutes
    } = matchTime;

    if (matchDateStr === todayStr && timestamp && (!scheduleMeta.todayEarliestTimestamp || timestamp < scheduleMeta.todayEarliestTimestamp)) {
      scheduleMeta.todayEarliestTimestamp = timestamp;
    }

    if (matchDateStr !== "-" && (matchDateStr >= todayStr || !isFinished)) {
      if (!allFutureMatches[matchDateStr]) allFutureMatches[matchDateStr] = [];
      const tabName = match.Tab || "";
      allFutureMatches[matchDateStr].push({
        time: matchTimeStr,
        team1Name, team2Name,
        team1Score, team2Score,
        bestOf, winner, isForfeit,
        isFinished, isLive,
        leagueShort: tournamentLeagueShort,
        slug: tournamentSlug,
        tournamentIndex,
        tabName: tabName || "",
        timestamp
      });
    }

    if (isFinished) {
      if (timestamp > stats[team1Name].last) stats[team1Name].last = timestamp;
      if (timestamp > stats[team2Name].last) stats[team2Name].last = timestamp;

      parsedMatches.push({
        team1Name, team2Name, team1Score, team2Score, bestOf, winner, isForfeit, isFullLength,
        dateDisplay, fullDateDisplay,
        timestamp, weekdayIndex, timeMinutes, roundedMinutes, matchDateStr
      });
    }

    if (!isFinished) {
      if (matchDateStr === todayStr) {
        scheduleMeta.todayUnfinished++;
      } else if (matchDateStr < todayStr) {
        scheduleMeta.hasHistoryUnfinished = true;
      }
    }

    let team1MatchResultCode = 'NEXT', team2MatchResultCode = 'NEXT';
    if (isLive) {
      team1MatchResultCode = 'LIVE';
      team2MatchResultCode = 'LIVE';
    } else if (isFinished) {
      team1MatchResultCode = winner === 1 ? 'WIN' : winner === 2 ? 'LOSS' : 'DRAW';
      team2MatchResultCode = winner === 2 ? 'WIN' : winner === 1 ? 'LOSS' : 'DRAW';
    }

    stats[team1Name].history.push({
      dateDisplay, fullDateDisplay,
      opponentName: team2Name,
      scoreDisplay: `${team1Score}-${team2Score}`,
      matchResultCode: team1MatchResultCode,
      bestOf, isForfeit, isFullLength, timestamp
    });
    stats[team2Name].history.push({
      dateDisplay, fullDateDisplay,
      opponentName: team1Name,
      scoreDisplay: `${team2Score}-${team1Score}`,
      matchResultCode: team2MatchResultCode,
      bestOf, isForfeit, isFullLength, timestamp
    });

    if (!isFinished) { return; }

    const winnerName = winner === 1 ? team1Name : winner === 2 ? team2Name : null;
    const loserName = winner === 1 ? team2Name : winner === 2 ? team1Name : null;

    [team1Name, team2Name].forEach(teamName => {
      stats[teamName].seriesTotalMatchCount++;
      stats[teamName].gameTotalCount += (team1Score + team2Score);
    });

    if (winnerName) stats[winnerName].seriesWinCount++;
    stats[team1Name].gameWinCount += team1Score;
    stats[team2Name].gameWinCount += team2Score;

    if (bestOf === 3) {
      stats[team1Name].bestOf3TotalMatchCount++;
      stats[team2Name].bestOf3TotalMatchCount++;
      if (isFullLength) {
        stats[team1Name].bestOf3FullMatchCount++;
        stats[team2Name].bestOf3FullMatchCount++;
      }
    } else if (bestOf === 5) {
      stats[team1Name].bestOf5TotalMatchCount++;
      stats[team2Name].bestOf5TotalMatchCount++;
      if (isFullLength) {
        stats[team1Name].bestOf5FullMatchCount++;
        stats[team2Name].bestOf5FullMatchCount++;
      }
    }

    if (winnerName && loserName) {
      if (stats[winnerName].lossStreakCount > 0) {
        stats[winnerName].lossStreakCount = 0;
        stats[winnerName].winStreakCount = 1;
      } else {
        stats[winnerName].winStreakCount++;
      }
      if (stats[loserName].winStreakCount > 0) {
        stats[loserName].winStreakCount = 0;
        stats[loserName].lossStreakCount = 1;
      } else {
        stats[loserName].lossStreakCount++;
      }
    }
  });

  Object.values(stats).forEach(team => team.history.sort((leftHistory, rightHistory) => rightHistory.timestamp - leftHistory.timestamp));

  return { stats, parsedMatches, scheduleMeta };
}
