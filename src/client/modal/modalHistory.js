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

function renderHistoryMatch(teamName, match) {
    const resultLabel = resultLabelMap[match.matchResultCode];
    if (!resultLabel) throw new Error('Invalid match result code: ' + match.matchResultCode);
    const resultClass = 'match-result match-result-' + match.matchResultCode.toLowerCase();
    const resultTag = '<span class="' + resultClass + '">' + resultLabel + '</span>';
    const details = renderMatchDetails(match);
    return renderMatchCard({
        ...match,
        leftTeamName: teamName,
        rightTeamName: match.opponentName
    }, details, resultTag);
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

function renderTeamHistoryModal(titleParts, teamName, history) {
    const finishedMatches = sortHistoryMatches(history.filter(isFinishedHistoryMatch), true);
    const upcomingMatches = sortHistoryMatches(history.filter(match => !isFinishedHistoryMatch(match)), false);
    const listHtml = finishedMatches.map(match => renderHistoryMatch(teamName, match));

    if (upcomingMatches.length > 0) {
        listHtml.push('<div class="history-section-divider"><span>UPCOMING</span></div>');
        upcomingMatches.forEach(match => listHtml.push(renderHistoryMatch(teamName, match)));
    }

    setModalTitle('MATCH HISTORY', titleParts);
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display = 'block';
}

function openTeam(slug, teamName) {
    const teamStats = requireModalTeamStats(slug, teamName);
    const finishedCount = teamStats.history.filter(isFinishedHistoryMatch).length;
    renderTeamHistoryModal([
        { kind: 'text', text: teamName },
        { kind: 'divider', text: '·' },
        { kind: 'record', value: finishedCount + '/' + teamStats.history.length, separator: '/' }
    ], teamName, teamStats.history);
}

function formatStatsRecord(wins, total, label) {
    if (!Number.isInteger(wins) || !Number.isInteger(total) || wins < 0 || total < wins) {
        throw new Error('Invalid ' + label + ' record: ' + wins + '/' + total);
    }
    return wins + '-' + (total - wins);
}

function formatHistoryRecord(history, label) {
    const wins = history.filter(match => match.matchResultCode === 'WIN').length;
    return formatStatsRecord(wins, history.length, label);
}

function openStats(slug, teamName, type) {
    const teamStats = requireModalTeamStats(slug, teamName);
    const finishedHistory = teamStats.history.filter(isFinishedHistoryMatch);
    let historyByType;
    let statLabel;
    let record;
    if (type === 'bo3') {
        historyByType = finishedHistory.filter(match => match.bestOf === 3);
        statLabel = 'BO3';
        record = formatHistoryRecord(historyByType, 'bo3');
    } else if (type === 'bo5') {
        historyByType = finishedHistory.filter(match => match.bestOf === 5);
        statLabel = 'BO5';
        record = formatHistoryRecord(historyByType, 'bo5');
    } else if (type === 'series') {
        historyByType = finishedHistory;
        statLabel = 'SERIES';
        record = formatStatsRecord(teamStats.seriesWinCount, teamStats.seriesTotalMatchCount, 'series');
    } else if (type === 'games') {
        historyByType = finishedHistory.filter(match => Array.isArray(match.gameResults));
        statLabel = 'GAMES';
        record = formatStatsRecord(teamStats.gameWinCount, teamStats.gameTotalCount, 'games');
    } else if (type === 'seriesTrailed') {
        historyByType = finishedHistory.filter(match => match.wasBehind === true);
        statLabel = 'BEHIND';
        record = formatStatsRecord(teamStats.comebackCount, teamStats.seriesTrailedCount, 'behind');
    } else if (type === 'seriesLed') {
        historyByType = finishedHistory.filter(match => match.wasAhead === true);
        statLabel = 'AHEAD';
        record = formatStatsRecord(teamStats.seriesLedCount - teamStats.lostLeadCount, teamStats.seriesLedCount, 'ahead');
    } else {
        throw new Error('Unknown stats type: ' + type);
    }
    renderTeamHistoryModal([
        { kind: 'text', text: teamName },
        { kind: 'divider', text: '·' },
        { kind: 'record', prefix: statLabel + ' ', value: record, separator: '-' }
    ], teamName, historyByType);
}

function openH2H(team1Name, team2Name) {
    if (!Array.isArray(window.gH2HMatches)) throw new Error('H2H matches missing');
    const h2hHistory = window.gH2HMatches.filter(match =>
        (match.leftTeamName === team1Name && match.rightTeamName === team2Name) ||
        (match.leftTeamName === team2Name && match.rightTeamName === team1Name)
    );
    let team1Wins = 0;
    let team2Wins = 0;
    h2hHistory.forEach(match => {
        const team1IsLeft = match.leftTeamName === team1Name;
        if (match.matchResultCode === 'WIN') {
            if (team1IsLeft) team1Wins++;
            else team2Wins++;
        } else if (match.matchResultCode === 'LOSS') {
            if (team1IsLeft) team2Wins++;
            else team1Wins++;
        }
    });
    const titleParts = [{ kind: 'text', text: team1Name + ' vs ' + team2Name }];
    if (h2hHistory.length > 0) {
        titleParts.push(
            { kind: 'divider', text: '·' },
            { kind: 'record', value: team1Wins + '-' + team2Wins, separator: '-' }
        );
    }
    setModalTitle('HEAD TO HEAD', titleParts);
    renderListHTML(h2hHistory.map(renderH2HMatch));
    document.getElementById('matchModal').style.display = 'block';
}

function renderH2HMatch(match) {
    if (typeof match.leagueShort !== 'string' || !match.leagueShort) throw new Error('H2H leagueShort missing');
    const sourceTag = '<span class="match-source">' + escapeModalHtml(match.leagueShort) + '</span>';
    return renderMatchCard(match, renderMatchDetails(match), sourceTag);
}
`;
