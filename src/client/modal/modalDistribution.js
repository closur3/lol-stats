export const modalDistribution = `
function showPopup(title, dayIndex, matches) {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Total"];
    const dayName = dayNames[dayIndex];
    if (!dayName) throw new Error('Invalid Time Grid day index: ' + dayIndex);
    const timeLabel = title === 'Total' ? 'ALL TIMES' : title;
    const dayLabel = dayName === 'Total' ? 'ALL DAYS' : dayName.toUpperCase();
    setModalTitle('TIME DISTRIBUTION', [
        { kind: 'text', text: timeLabel },
        { kind: 'divider', text: '·' },
        { kind: 'text', text: dayLabel }
    ]);
    const sortedMatches = [...matches].sort((matchA, matchB) => (matchB.timestamp || 0) - (matchA.timestamp || 0) || matchB.dateDisplay.localeCompare(matchA.dateDisplay));
    const listHtml = sortedMatches.map(match => {
        let matchResultCode;
        if (match.winner === 1) matchResultCode = 'WIN';
        else if (match.winner === 2) matchResultCode = 'LOSS';
        else if (match.winner === 0) matchResultCode = 'DRAW';
        else throw new Error('Invalid Time Grid winner: ' + match.winner);
        const neutralMatch = {
            ...match,
            leftTeamName: match.team1Name,
            rightTeamName: match.team2Name,
            matchResultCode
        };
        return renderMatchCard(neutralMatch, renderMatchDetails(neutralMatch));
    });
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display = "block";
}
`;
