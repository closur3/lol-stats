export const MODAL_DISTRIBUTION = `
function showPopup(title, dayIndex, matches) {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Total"];
    document.getElementById('modalTitle').innerText = title + " - " + dayNames[dayIndex];
    const sortedMatches = [...matches].sort((matchA, matchB) => (matchB.timestamp || 0) - (matchA.timestamp || 0) || matchB.dateDisplay.localeCompare(matchA.dateDisplay));
    const listHtml = sortedMatches.map(match => {
        let boTag = '<span ' + STYLE_MUTED_DASH + '>-</span>';
        if (match.bestOf === 5) boTag = '<span class="sch-pill gold">BO5</span>';
        else if (match.bestOf === 3) boTag = '<span class="sch-pill">BO3</span>';
        else if (match.bestOf === 1) boTag = '<span class="sch-pill">BO1</span>';
        return renderMatchItem('distribution', match.dateDisplay, boTag, match.team1Name, match.team2Name, match.isFullLength, match.scoreDisplay, null, match.isoTimestamp);
    });
    renderListHTML(listHtml);
    document.getElementById('matchModal').style.display = "block";
}
`;
