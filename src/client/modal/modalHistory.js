export const MODAL_HISTORY = `
function openTeam(slug, teamName) {
    if (!window.g_stats || !window.g_stats[slug] || !window.g_stats[slug][teamName]) return;
    const data = window.g_stats[slug][teamName];
    document.getElementById('modalTitle').innerText = teamName + " - Schedule";
    
    const history = data.history || [];
    
    const finished = history.filter(match => match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS');
    const upcoming = history.filter(match => match.matchResultCode === 'NEXT' || match.matchResultCode === 'LIVE');
    
    finished.sort((leftMatch, rightMatch) => (rightMatch.timestamp || 0) - (leftMatch.timestamp || 0) || rightMatch.dateDisplay.localeCompare(leftMatch.dateDisplay));
    upcoming.sort((leftMatch, rightMatch) => (leftMatch.timestamp || 0) - (rightMatch.timestamp || 0) || leftMatch.dateDisplay.localeCompare(rightMatch.dateDisplay));
    
    let listHtml = [];
    
    finished.forEach(match => {
        const icon = RESULT_ICON_MAP[match.matchResultCode] || RESULT_ICON_MAP['NEXT'];
        const resultTag = '<span class="' + ((match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS') ? '' : 'hist-icon') + '">' + icon + '</span>';
        listHtml.push(renderMatchItem('history', match.dateDisplay, resultTag, teamName, match.opponentName, match.isFullLength, match.scoreDisplay, match.matchResultCode, match.isoTimestamp));
    });
    
    if (upcoming.length > 0) {
        const marginTop = finished.length > 0 ? 'margin-top:16px;' : '';
        listHtml.push('<div style="border-top:2px solid #3b82f6;margin:8px 0;' + marginTop + '"></div>');
        upcoming.forEach(match => {
            const icon = RESULT_ICON_MAP[match.matchResultCode] || RESULT_ICON_MAP['NEXT'];
            const resultTag = '<span class="' + ((match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS') ? '' : 'hist-icon') + '">' + icon + '</span>';
            listHtml.push(renderMatchItem('history', match.dateDisplay, resultTag, teamName, match.opponentName, match.isFullLength, match.scoreDisplay, match.matchResultCode, match.isoTimestamp));
        });
    }
    
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display="block";
}

function openStats(slug, teamName, type) {
    if (!window.g_stats || !window.g_stats[slug] || !window.g_stats[slug][teamName]) return;
    const data = window.g_stats[slug][teamName];
    let history = data.history || [];
    let titleSuffix = "";
    if (type === 'bo3') { history = history.filter(match => match.bestOf === 3); titleSuffix = " - BO3"; }
    else if (type === 'bo5') { history = history.filter(match => match.bestOf === 5); titleSuffix = " - BO5"; }
    else { titleSuffix = " - Series"; }
    document.getElementById('modalTitle').innerText = teamName + titleSuffix;
    
    const finished = history.filter(match => match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS');
    const upcoming = history.filter(match => match.matchResultCode === 'NEXT' || match.matchResultCode === 'LIVE');
    
    finished.sort((leftMatch, rightMatch) => (rightMatch.timestamp || 0) - (leftMatch.timestamp || 0) || rightMatch.dateDisplay.localeCompare(leftMatch.dateDisplay));
    upcoming.sort((leftMatch, rightMatch) => (leftMatch.timestamp || 0) - (rightMatch.timestamp || 0) || leftMatch.dateDisplay.localeCompare(rightMatch.dateDisplay));
    
    let listHtml = [];
    
    finished.forEach(match => {
        const icon = RESULT_ICON_MAP[match.matchResultCode] || RESULT_ICON_MAP['NEXT'];
        const resultTag = '<span class="' + ((match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS') ? '' : 'hist-icon') + '">' + icon + '</span>';
        listHtml.push(renderMatchItem('history', match.dateDisplay, resultTag, teamName, match.opponentName, match.isFullLength, match.scoreDisplay, match.matchResultCode, match.isoTimestamp));
    });
    
    if (upcoming.length > 0) {
        const marginTop = finished.length > 0 ? 'margin-top:16px;' : '';
        listHtml.push('<div style="border-top:2px solid #3b82f6;margin:8px 0;' + marginTop + '"></div>');
        upcoming.forEach(match => {
            const icon = RESULT_ICON_MAP[match.matchResultCode] || RESULT_ICON_MAP['NEXT'];
            const resultTag = '<span class="' + ((match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS') ? '' : 'hist-icon') + '">' + icon + '</span>';
            listHtml.push(renderMatchItem('history', match.dateDisplay, resultTag, teamName, match.opponentName, match.isFullLength, match.scoreDisplay, match.matchResultCode, match.isoTimestamp));
        });
    }
    
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display="block";
}

function openH2H(slug, team1Name, team2Name) {
    if (!window.g_stats || !window.g_stats[slug] || !window.g_stats[slug][team1Name]) return;
    const data = window.g_stats[slug][team1Name];
    const h2hHistory = (data.history || []).filter(match => match.opponentName === team2Name);
    let team1Wins = 0, team2Wins = 0;
    h2hHistory.forEach(match => { if(match.matchResultCode === 'WIN') team1Wins++; else if(match.matchResultCode === 'LOSS') team2Wins++; });
    const summary = h2hHistory.length > 0 ? ' <span ' + STYLE_H2H_SUMMARY + '>(' + team1Wins + '<span ' + STYLE_H2H_DASH + '>-</span>' + team2Wins + ')</span>' : "";
    document.getElementById('modalTitle').innerHTML = team1Name + " vs " + team2Name + summary;
    const listHtml = h2hHistory.map(match => {
        const icon = RESULT_ICON_MAP[match.matchResultCode] || RESULT_ICON_MAP['NEXT'];
        const resultTag = '<span class="' + ((match.matchResultCode === 'WIN' || match.matchResultCode === 'LOSS') ? '' : 'hist-icon') + '">' + icon + '</span>';
        return renderMatchItem('history', match.dateDisplay, resultTag, team1Name, match.opponentName, match.isFullLength, match.scoreDisplay, match.matchResultCode, match.isoTimestamp);
    });
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display="block";
}
`;
