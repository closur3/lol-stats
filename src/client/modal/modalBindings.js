export const modalBindings = `
function closePopup(){document.getElementById('matchModal').style.display="none";}
window.onclick=function(event){if(event.target==document.getElementById('matchModal'))closePopup();}

window.renderMatchItem = renderMatchItem;
window.renderListHTML = renderListHTML;
window.showPopup = showPopup;
window.openTeam = openTeam;
window.openStats = openStats;
window.openH2H = openH2H;
window.closePopup = closePopup;
`;
