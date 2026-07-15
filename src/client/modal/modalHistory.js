export const modalHistory = `
function requireModalTeamStats(slug, teamName) {
    const tournamentStats = window.gStats && window.gStats[slug];
    if (!tournamentStats || !tournamentStats[teamName]) {
        throw new Error('Team stats missing: ' + slug + ':' + teamName);
    }
    const teamStats = tournamentStats[teamName];
    if (!Array.isArray(teamStats.history)) {
        throw new Error('Team history missing: ' + slug + ':' + teamName);
    }
    return teamStats;
}

function isFinishedHistoryMatch(match) {
    return match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS' || match.matchResultCode === 'DRAW';
}

function renderGameResults(gameResults) {
    if (!Array.isArray(gameResults)) return '';
    if (gameResults.length === 0) throw new Error('Game results cannot be empty');
    const resultHtml = gameResults.map(result => {
        if (result !== 'W' && result !== 'L') throw new Error('Invalid game result: ' + result);
        const resultClass = result === 'W' ? 'game-result-win' : 'game-result-loss';
        return '<span class="game-result ' + resultClass + '">' + result + '</span>';
    }).join('');
    return '<div class="game-results">' + resultHtml + '</div>';
}

function renderMatchDetails(match) {
    const hasGameResults = Array.isArray(match.gameResults);
    if (match.turnaroundType != null && !hasGameResults) {
        throw new Error('Turnaround event requires game results');
    }

    const gameResultsHtml = renderGameResults(match.gameResults);
    const turnaroundHtml = renderTurnaroundTag(match.turnaroundType, match.matchResultCode);
    if (!gameResultsHtml && !turnaroundHtml) return '';

    const layoutClass = turnaroundHtml ? 'has-turnaround' : 'game-only';
    return '<div class="match-details ' + layoutClass + '">' + gameResultsHtml + turnaroundHtml + '</div>';
}

function renderHistoryMatch(teamName, match) {
    const resultLabel = resultLabelMap[match.matchResultCode];
    if (!resultLabel) throw new Error('Invalid match result code: ' + match.matchResultCode);
    const resultClass = 'match-result match-result-' + match.matchResultCode.toLowerCase();
    const resultTag = '<span class="' + resultClass + '">' + resultLabel + '</span>';
    const details = renderMatchDetails(match);
    return renderMatchItem('history', match.dateDisplay, resultTag, teamName, match.opponentName, match.isFullLength, match.scoreDisplay, match.matchResultCode, match.isForfeit, details);
}

function renderTurnaroundTag(turnaroundType, matchResultCode) {
    if (turnaroundType == null) return '';
    if (matchResultCode !== 'WIN' && matchResultCode !== 'LOSS') {
        throw new Error('Turnaround event requires a finished series');
    }

    const isWin = matchResultCode === 'WIN';
    if (turnaroundType === 'leadChange') {
        const label = isWin ? 'COME BACK' : 'LOST LEAD';
        const icon = isWin
            ? '<svg viewBox="0 0 24 24"><path d="m3 17 6-6 4 4 8-8"></path><path d="M14 7h7v7"></path></svg>'
            : '<svg viewBox="0 0 24 24"><path d="m3 7 6 6 4-4 8 8"></path><path d="M14 17h7v-7"></path></svg>';
        const className = isWin ? 'turnaround-comeback' : 'turnaround-lost-lead';
        return renderTurnaroundBadge(icon, label, className);
    }
    if (turnaroundType === 'reverseSweep') {
        const label = isWin ? 'REVERSE SWEEP' : 'REVERSE SWEPT';
        const icon = isWin
            ? '<svg viewBox="0 0 24 24"><path d="M12 22c4.4 0 8-3.1 8-7.5 0-3.1-1.7-5.8-4-7.5 0 2-1 3.5-2.5 4.5.2-4-2.5-7.5-5.5-9.5.3 4.2-4 7-4 12.5C4 18.9 7.6 22 12 22Z"></path><path d="M9 16c0 1.7 1.3 3 3 3s3-1.3 3-3c0-1.3-.7-2.4-1.7-3.2 0 1-.5 1.7-1.3 2.2-.1-1.8-1.1-3.3-2.3-4.4.1 2.3-.7 3.5-.7 5.4Z"></path></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M12 3c.3 3-2.8 4.4-2.8 7.4 0 1.8 1.3 3.1 2.8 3.1s2.8-1.3 2.8-3.1c0-1.4-.6-2.7-1.5-3.8 2.7 1.3 4.5 3.7 4.5 6.5 0 3.2-2.6 5.4-5.8 5.4s-5.8-2.2-5.8-5.4C6.2 8.9 10 6.8 12 3Z"></path><path d="m6 18-2 2"></path><path d="M12 20v2"></path><path d="m18 18 2 2"></path></svg>';
        const className = isWin ? 'turnaround-reverse-sweep' : 'turnaround-reverse-swept';
        return renderTurnaroundBadge(icon, label, className);
    }
    throw new Error('Unknown turnaround type: ' + turnaroundType);
}

function renderTurnaroundBadge(icon, label, className) {
    return '<div class="turnaround-event"><span class="turnaround-badge ' + className + '">' +
        '<span class="turnaround-icon" aria-hidden="true">' + icon + '</span>' + label + '</span></div>';
}

function sortHistoryMatches(matches, newestFirst) {
    return [...matches].sort((leftMatch, rightMatch) => {
        const timestampOrder = newestFirst
            ? (rightMatch.timestamp - leftMatch.timestamp)
            : (leftMatch.timestamp - rightMatch.timestamp);
        if (timestampOrder !== 0) return timestampOrder;
        return newestFirst
            ? rightMatch.dateDisplay.localeCompare(leftMatch.dateDisplay)
            : leftMatch.dateDisplay.localeCompare(rightMatch.dateDisplay);
    });
}

function renderTeamHistoryModal(title, teamName, history) {
    const finishedMatches = sortHistoryMatches(history.filter(isFinishedHistoryMatch), true);
    const upcomingMatches = sortHistoryMatches(history.filter(match => !isFinishedHistoryMatch(match)), false);
    const listHtml = finishedMatches.map(match => renderHistoryMatch(teamName, match));

    if (upcomingMatches.length > 0) {
        const marginTop = finishedMatches.length > 0 ? 'margin-top:16px;' : '';
        listHtml.push('<div style="border-top:2px solid #3b82f6;margin:8px 0;' + marginTop + '"></div>');
        upcomingMatches.forEach(match => listHtml.push(renderHistoryMatch(teamName, match)));
    }

    document.getElementById('modalTitle').innerText = title;
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display = 'block';
}

function openTeam(slug, teamName) {
    const teamStats = requireModalTeamStats(slug, teamName);
    const finishedCount = teamStats.history.filter(isFinishedHistoryMatch).length;
    renderTeamHistoryModal(teamName + ' · ' + finishedCount + '/' + teamStats.history.length, teamName, teamStats.history);
}

function formatStatsRecord(wins, total, label) {
    if (!Number.isInteger(wins) || !Number.isInteger(total) || wins < 0 || total < wins) {
        throw new Error('Invalid ' + label + ' record: ' + wins + '/' + total);
    }
    return wins + '–' + (total - wins);
}

function formatHistoryRecord(history, label) {
    const wins = history.filter(match => match.matchResultCode === 'WIN').length;
    return formatStatsRecord(wins, history.length, label);
}

function openStats(slug, teamName, type) {
    const teamStats = requireModalTeamStats(slug, teamName);
    const finishedHistory = teamStats.history.filter(isFinishedHistoryMatch);
    let historyByType;
    let title;
    if (type === 'bo3') {
        historyByType = finishedHistory.filter(match => match.bestOf === 3);
        title = teamName + ' · BO3 ' + formatHistoryRecord(historyByType, 'bo3');
    } else if (type === 'bo5') {
        historyByType = finishedHistory.filter(match => match.bestOf === 5);
        title = teamName + ' · BO5 ' + formatHistoryRecord(historyByType, 'bo5');
    } else if (type === 'series') {
        historyByType = finishedHistory;
        title = teamName + ' · SERIES ' + formatStatsRecord(teamStats.seriesWinCount, teamStats.seriesTotalMatchCount, 'series');
    } else if (type === 'games') {
        historyByType = finishedHistory.filter(match => Array.isArray(match.gameResults));
        title = teamName + ' · GAMES ' + formatStatsRecord(teamStats.gameWinCount, teamStats.gameTotalCount, 'games');
    } else if (type === 'seriesTrailed') {
        historyByType = finishedHistory.filter(match => match.wasBehind === true);
        title = teamName + ' · BEHIND ' + formatStatsRecord(teamStats.comebackCount, teamStats.seriesTrailedCount, 'behind');
    } else if (type === 'seriesLed') {
        historyByType = finishedHistory.filter(match => match.wasAhead === true);
        title = teamName + ' · AHEAD ' + formatStatsRecord(teamStats.seriesLedCount - teamStats.lostLeadCount, teamStats.seriesLedCount, 'ahead');
    } else {
        throw new Error('Unknown stats type: ' + type);
    }
    renderTeamHistoryModal(title, teamName, historyByType);
}

function openH2H(slug, team1Name, team2Name) {
    const team1Stats = requireModalTeamStats(slug, team1Name);
    const h2hHistory = team1Stats.history.filter(match => match.opponentName === team2Name);
    let team1Wins = 0;
    let team2Wins = 0;
    h2hHistory.forEach(match => {
        if (match.matchResultCode === 'WIN') team1Wins++;
        else if (match.matchResultCode === 'LOSS') team2Wins++;
    });
    const summary = h2hHistory.length > 0
        ? ' <span ' + styleH2hSummary + '>(' + team1Wins + '<span ' + styleH2hDash + '>-</span>' + team2Wins + ')</span>'
        : '';
    document.getElementById('modalTitle').innerHTML = escapeModalHtml(team1Name) + ' vs ' + escapeModalHtml(team2Name) + summary;
    renderListHTML(h2hHistory.map(match => renderHistoryMatch(team1Name, match)));
    document.getElementById('matchModal').style.display = 'block';
}
`;
