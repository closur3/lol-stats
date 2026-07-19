export const modalBindings = `
function closePopup() {
  document.getElementById('matchModal').style.display = 'none';
}

window.addEventListener('click', function(event) {
  if (event.target === document.getElementById('matchModal')) closePopup();
});

window.showPopup = showPopup;
window.openTeam = openTeam;
window.openStats = openStats;
window.openH2H = openH2H;
window.switchHistoryStatus = switchHistoryStatus;
window.closePopup = closePopup;
`;
