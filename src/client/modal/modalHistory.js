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
    const icon = resultIconMap[match.matchResultCode] || resultIconMap.NEXT;
    const resultClass = match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS' ? '' : 'hist-icon';
    const resultTag = '<span class="' + resultClass + '">' + icon + '</span>';
    return renderMatchItem('history', match.dateDisplay, resultTag, teamName, match.opponentName, match.isFullLength, match.scoreDisplay, match.matchResultCode, match.isForfeit);
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
    renderTeamHistoryModal(teamName + ' - Schedule', teamName, teamStats.history);
}

function openStats(slug, teamName, type) {
    const teamStats = requireModalTeamStats(slug, teamName);
    const historyByType = type === 'bo3'
        ? teamStats.history.filter(match => match.bestOf === 3)
        : type === 'bo5'
          ? teamStats.history.filter(match => match.bestOf === 5)
          : teamStats.history;
    const titleSuffix = type === 'bo3' ? ' - BO3' : type === 'bo5' ? ' - BO5' : ' - Series';
    renderTeamHistoryModal(teamName + titleSuffix, teamName, historyByType);
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
