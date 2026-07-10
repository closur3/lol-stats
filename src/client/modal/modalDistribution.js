export const modalDistribution = `
function showPopup(title, dayIndex, matches) {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Total"];
    document.getElementById('modalTitle').innerText = title + " - " + dayNames[dayIndex];
    const sortedMatches = [...matches].sort((matchA, matchB) => (matchB.timestamp || 0) - (matchA.timestamp || 0) || matchB.dateDisplay.localeCompare(matchA.dateDisplay));
    const listHtml = sortedMatches.map(match => {
        const bestOfClass = 'best-of-pill bo' + match.bestOf;
        const boTag = '<span class="' + bestOfClass + '">BO' + match.bestOf + '</span>';
        return renderMatchItem('distribution', match.dateDisplay, boTag, match.team1Name, match.team2Name, match.isFullLength, match.scoreDisplay, null);
    });
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display = "block";
}
`;
