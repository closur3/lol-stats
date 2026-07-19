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

function countH2HWins(history, team1Name, team2Name) {
    let team1Wins = 0;
    let team2Wins = 0;
    history.forEach(match => {
        const team1IsLeft = match.teamName === team1Name && match.opponentName === team2Name;
        const team2IsLeft = match.teamName === team2Name && match.opponentName === team1Name;
        if (!team1IsLeft && !team2IsLeft) throw new Error('H2H match teams do not match title');
        if (match.matchResultCode === 'WIN') {
            if (team1IsLeft) team1Wins++;
            else team2Wins++;
        } else if (match.matchResultCode === 'LOSS') {
            if (team1IsLeft) team2Wins++;
            else team1Wins++;
        }
    });
    return { team1Wins, team2Wins };
}

function renderH2HGroups(history, status, team1Name, team2Name) {
    if (status !== 'finished' && status !== 'upcoming') throw new Error('Invalid H2H group status: ' + status);
    const newestFirst = status === 'finished';
    return groupHistoryMatches(history, newestFirst).map(group => {
        const groupMatches = sortHistoryMatches(group.matches, true);
        let groupMeta;
        if (status === 'finished') {
            const record = countH2HWins(groupMatches, team1Name, team2Name);
            groupMeta = '<span class="history-group-record"><b>' + record.team1Wins + '</b><i>–</i><b>' + record.team2Wins + '</b></span>';
        } else {
            groupMeta = '<span class="history-group-count">' + groupMatches.length + '</span>';
        }
        const tabHtml = Array.from(group.tabs.values()).sort((left, right) => newestFirst
            ? right.latestTimestamp - left.latestTimestamp
            : left.latestTimestamp - right.latestTimestamp).map(tab => {
            const tabTitle = tab.tabName.length > 0 ? '<div class="history-tab-label">' + escapeModalHtml(tab.tabName) + '</div>' : '';
            return '<div class="history-tab-group">' + tabTitle + '<div class="history-group-list">' + sortHistoryMatches(tab.matches, newestFirst).map(renderH2HMatch).join('') + '</div></div>';
        }).join('');
        return '<section class="h2h-tournament-group">' +
            '<div class="h2h-group-heading"><span>' + escapeModalHtml(group.tournamentName) + '</span><span class="h2h-group-meta">' + groupMeta + '</span></div>' +
            tabHtml +
            '</section>';
    });
}

function renderHistoryStatusView(view, items, activeView) {
    if (view !== 'finished' && view !== 'upcoming') throw new Error('Invalid history status view: ' + view);
    if (!Array.isArray(items)) throw new Error('History status view items are required');
    const hiddenClass = view === activeView ? '' : ' is-hidden';
    const ariaHidden = view === activeView ? 'false' : 'true';
    const emptyLabel = view === 'finished' ? 'NO FINISHED MATCHES' : 'NO UPCOMING MATCHES';
    return '<div id="history-status-' + view + '" class="history-status-view' + hiddenClass + '" data-history-status="' + view + '" role="tabpanel" aria-hidden="' + ariaHidden + '">' +
        (items.length > 0 ? items.join('') : '<div class="history-status-empty">' + emptyLabel + '</div>') +
        '</div>';
}

function switchHistoryStatus(view) {
    if (view !== 'finished' && view !== 'upcoming') throw new Error('Invalid history status: ' + view);
    document.querySelectorAll('[data-history-status]').forEach(element => {
        const isActive = element.dataset.historyStatus === view;
        element.classList.toggle('is-hidden', !isActive);
        element.setAttribute('aria-hidden', String(!isActive));
    });
    document.querySelectorAll('[data-history-status-target]').forEach(button => {
        const isActive = button.dataset.historyStatusTarget === view;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });
    document.getElementById('modalList').scrollTop = 0;
}

function renderHistoryStatusButton(view, count, activeView) {
    if (view !== 'finished' && view !== 'upcoming') throw new Error('Invalid history status button: ' + view);
    if (!Number.isInteger(count) || count < 0) throw new Error('Invalid history status count: ' + count);
    const isActive = view === activeView;
    const label = view === 'finished' ? 'Finished matches' : 'Upcoming matches';
    const icon = view === 'finished'
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>';
    return '<button type="button" class="history-status-button' + (isActive ? ' is-active' : '') + '" role="tab" ' +
        'aria-label="' + label + ': ' + count + '" ' +
        'aria-controls="history-status-' + view + '" aria-selected="' + String(isActive) + '" data-history-status-target="' + view + '" ' +
        'onclick="switchHistoryStatus(\\'' + view + '\\')">' + icon + '<span>' + count + '</span></button>';
}

function renderHistoryStatusSwitch(finishedCount, upcomingCount, activeView) {
    return '<div class="history-status-switch" role="tablist" aria-label="Match status">' +
        '<div class="history-status-switch-control">' +
        renderHistoryStatusButton('finished', finishedCount, activeView) +
        renderHistoryStatusButton('upcoming', upcomingCount, activeView) +
        '</div></div>';
}

function attachHistoryStatusSwitch(switchHtml) {
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.classList.add('history-status-modal-title');
    modalTitle.insertAdjacentHTML('beforeend', switchHtml);
}

function renderTeamHistoryModal(titleParts, teamName, history, grouped) {
    const finishedMatches = sortHistoryMatches(history.filter(isFinishedHistoryMatch), true);
    const upcomingMatches = sortHistoryMatches(history.filter(match => !isFinishedHistoryMatch(match)), false);
    if (grouped) {
        const activeView = finishedMatches.length > 0 ? 'finished' : 'upcoming';
        setModalTitle('MATCH HISTORY', titleParts);
        attachHistoryStatusSwitch(renderHistoryStatusSwitch(finishedMatches.length, upcomingMatches.length, activeView));
        renderListHTML([
            renderHistoryStatusView('finished', renderHistoryGroups(teamName, finishedMatches, true), activeView),
            renderHistoryStatusView('upcoming', renderHistoryGroups(teamName, upcomingMatches, false), activeView)
        ]);
        document.getElementById('matchModal').style.display = 'block';
        return;
    }

    const listHtml = renderFlatHistory(teamName, finishedMatches);
    if (upcomingMatches.length > 0) {
        listHtml.push('<div class="history-section-divider"><span>UPCOMING</span></div>');
        listHtml.push(...renderFlatHistory(teamName, upcomingMatches));
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
    const record = countH2HWins(finishedHistory, team1Name, team2Name);
    const titleParts = [{ kind: 'text', text: team1Name + ' vs ' + team2Name }];
    if (finishedHistory.length > 0) {
        titleParts.push(
            { kind: 'divider', text: '·' },
            { kind: 'record', value: record.team1Wins + '-' + record.team2Wins, separator: '-' }
        );
    }
    const activeView = finishedHistory.length > 0 ? 'finished' : 'upcoming';
    setModalTitle('HEAD TO HEAD', titleParts);
    attachHistoryStatusSwitch(renderHistoryStatusSwitch(finishedHistory.length, upcomingHistory.length, activeView));
    renderListHTML([
        renderHistoryStatusView('finished', renderH2HGroups(finishedHistory, 'finished', team1Name, team2Name), activeView),
        renderHistoryStatusView('upcoming', renderH2HGroups(upcomingHistory, 'upcoming', team1Name, team2Name), activeView)
    ]);
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
