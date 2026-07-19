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

function requireModalHistory() {
    if (!Array.isArray(window.gModalHistory)) throw new Error('Global modal history missing');
    return window.gModalHistory;
}

function isFinishedHistoryMatch(match) {
    return match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS' || match.matchResultCode === 'DRAW';
}

function renderHistoryResultTag(match) {
    const resultLabel = resultLabelMap[match.matchResultCode];
    if (!resultLabel) throw new Error('Invalid match result code: ' + match.matchResultCode);
    const resultClass = 'match-result match-result-' + match.matchResultCode.toLowerCase();
    return '<span class="' + resultClass + '">' + resultLabel + '</span>';
}

function renderHistoryMatch(teamName, match) {
    const resultTag = renderHistoryResultTag(match);
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

function groupHistoryMatches(history, newestFirst) {
    const groups = new Map();
    history.forEach(match => {
        if (typeof match.tournamentSlug !== 'string' || match.tournamentSlug.length === 0) {
            throw new Error('Tournament slug missing from modal history');
        }
        if (typeof match.tournamentName !== 'string' || match.tournamentName.length === 0) {
            throw new Error('Tournament name missing from modal history');
        }
        if (typeof match.tabName !== 'string') throw new Error('Tab name missing from modal history');
        let current = groups.get(match.tournamentSlug);
        if (current) {
            current.matches.push(match);
            current.latestTimestamp = Math.max(current.latestTimestamp, match.timestamp);
            const tab = current.tabs.get(match.tabName);
            if (tab) {
                tab.matches.push(match);
                tab.latestTimestamp = Math.max(tab.latestTimestamp, match.timestamp);
            } else {
                current.tabs.set(match.tabName, { tabName: match.tabName, matches: [match], latestTimestamp: match.timestamp });
            }
            return;
        }
        groups.set(match.tournamentSlug, {
            tournamentName: match.tournamentName,
            matches: [match],
            latestTimestamp: match.timestamp,
            tabs: new Map([[match.tabName, { tabName: match.tabName, matches: [match], latestTimestamp: match.timestamp }]])
        });
    });
    return Array.from(groups.values()).sort((left, right) => newestFirst
        ? right.latestTimestamp - left.latestTimestamp
        : left.latestTimestamp - right.latestTimestamp);
}

function renderHistoryGroups(teamName, history, newestFirst) {
    return groupHistoryMatches(history, newestFirst).map((group, index) => {
        const groupMatches = sortHistoryMatches(group.matches, true);
        const openAttribute = index === 0 ? ' open' : '';
        const groupRecord = renderHistoryGroupRecord(groupMatches);
        const groupMeta = groupRecord || '<span class="history-group-count">' + groupMatches.length + '</span>';
        const tabHtml = Array.from(group.tabs.values()).sort((left, right) => newestFirst
            ? right.latestTimestamp - left.latestTimestamp
            : left.latestTimestamp - right.latestTimestamp).map(tab => {
            const tabTitle = tab.tabName.length > 0 ? '<div class="history-tab-label">' + escapeModalHtml(tab.tabName) + '</div>' : '';
            return '<div class="history-tab-group">' + tabTitle + '<div class="history-group-list">' + sortHistoryMatches(tab.matches, newestFirst).map(match => renderHistoryMatch(teamName, match)).join('') + '</div></div>';
        }).join('');
        return '<details class="history-tournament-group"' + openAttribute + '>' +
            '<summary class="history-group-summary"><span>' + escapeModalHtml(group.tournamentName) + '</span><span class="history-group-meta">' + groupMeta + '</span></summary>' +
            tabHtml +
            '</details>';
    });
}

function renderFlatHistory(teamName, history) {
    return sortHistoryMatches(history, true).map(match => renderHistoryMatch(teamName, match));
}

function renderHistoryGroupRecord(matches) {
    const finishedMatches = matches.filter(isFinishedHistoryMatch);
    if (finishedMatches.length === 0) return '';
    const wins = finishedMatches.filter(match => match.matchResultCode === 'WIN').length;
    const losses = finishedMatches.filter(match => match.matchResultCode === 'LOSS').length;
    return '<span class="history-group-record"><b>' + wins + '</b><i>–</i><b>' + losses + '</b></span>';
}

function renderH2HGroups(history, newestFirst) {
    return groupHistoryMatches(history, newestFirst).map((group, index) => {
        const groupMatches = sortHistoryMatches(group.matches, true);
        const openAttribute = index === 0 ? ' open' : '';
        const tabHtml = Array.from(group.tabs.values()).sort((left, right) => newestFirst
            ? right.latestTimestamp - left.latestTimestamp
            : left.latestTimestamp - right.latestTimestamp).map(tab => {
            const tabTitle = tab.tabName.length > 0 ? '<div class="history-tab-label">' + escapeModalHtml(tab.tabName) + '</div>' : '';
            return '<div class="history-tab-group">' + tabTitle + '<div class="history-group-list">' + sortHistoryMatches(tab.matches, newestFirst).map(renderH2HMatch).join('') + '</div></div>';
        }).join('');
        return '<details class="history-tournament-group"' + openAttribute + '>' +
            '<summary class="history-group-summary"><span>' + escapeModalHtml(group.tournamentName) + '</span><span class="history-group-count">' + groupMatches.length + '</span></summary>' +
            tabHtml +
            '</details>';
    });
}

function renderTeamHistoryModal(titleParts, teamName, history, grouped) {
    const finishedMatches = sortHistoryMatches(history.filter(isFinishedHistoryMatch), true);
    const upcomingMatches = sortHistoryMatches(history.filter(match => !isFinishedHistoryMatch(match)), false);
    const listHtml = grouped
        ? renderHistoryGroups(teamName, finishedMatches, true)
        : renderFlatHistory(teamName, finishedMatches);

    if (upcomingMatches.length > 0) {
        listHtml.push('<div class="history-section-divider"><span>UPCOMING</span></div>');
        if (grouped) {
            listHtml.push(...renderHistoryGroups(teamName, upcomingMatches, false));
        } else {
            listHtml.push(...renderFlatHistory(teamName, upcomingMatches));
        }
    }

    setModalTitle('MATCH HISTORY', titleParts);
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display = 'block';
}

function openTeam(teamName) {
    const history = requireModalHistory().filter(match => match.teamName === teamName);
    const finishedCount = history.filter(isFinishedHistoryMatch).length;
    renderTeamHistoryModal([
        { kind: 'text', text: teamName },
        { kind: 'divider', text: '·' },
        { kind: 'record', value: finishedCount + '/' + history.length, separator: '/' }
    ], teamName, history, true);
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
    ], teamName, historyByType, false);
}

function openH2H(team1Name, team2Name) {
    const h2hHistory = requireModalHistory().filter(match =>
        match.scheduleSlot === 1 && (
            (match.teamName === team1Name && match.opponentName === team2Name) ||
            (match.teamName === team2Name && match.opponentName === team1Name)
        )
    );
    const finishedHistory = sortHistoryMatches(h2hHistory.filter(isFinishedHistoryMatch), true);
    const upcomingHistory = sortHistoryMatches(h2hHistory.filter(match => !isFinishedHistoryMatch(match)), false);
    let team1Wins = 0;
    let team2Wins = 0;
    finishedHistory.forEach(match => {
        const team1IsLeft = match.teamName === team1Name;
        if (match.matchResultCode === 'WIN') {
            if (team1IsLeft) team1Wins++;
            else team2Wins++;
        } else if (match.matchResultCode === 'LOSS') {
            if (team1IsLeft) team2Wins++;
            else team1Wins++;
        }
    });
    const titleParts = [{ kind: 'text', text: team1Name + ' vs ' + team2Name }];
    if (finishedHistory.length > 0) {
        titleParts.push(
            { kind: 'divider', text: '·' },
            { kind: 'record', value: team1Wins + '-' + team2Wins, separator: '-' }
        );
    }
    setModalTitle('HEAD TO HEAD', titleParts);
    const listHtml = renderH2HGroups(finishedHistory, true);
    if (upcomingHistory.length > 0) {
        listHtml.push('<div class="history-section-divider"><span>UPCOMING</span></div>');
        listHtml.push(...renderH2HGroups(upcomingHistory, false));
    }
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display = 'block';
}

function renderH2HMatch(match) {
    return renderMatchCard({
        ...match,
        leftTeamName: match.teamName,
        rightTeamName: match.opponentName
    }, renderMatchDetails(match));
}
`;
