export const PAGE_ACTIONS_SCRIPT = `
function getLeagueSections() {
    return Array.from(document.querySelectorAll("details.home-sec"));
}

function updateLeagueToggleButton() {
    const button = document.getElementById("floatingToggleLeagues");
    if (!button) return;
    const sections = getLeagueSections();
    if (sections.length === 0) {
        button.disabled = true;
        button.setAttribute("aria-label", "No leagues");
        button.dataset.actionState = "disabled";
        return;
    }
    const hasClosedSection = sections.some(section => !section.open);
    button.disabled = false;
    button.dataset.actionState = hasClosedSection ? "expand" : "collapse";
    button.setAttribute("aria-label", hasClosedSection ? "Expand all leagues" : "Collapse all leagues");
}

function toggleAllLeagues() {
    const sections = getLeagueSections();
    const shouldExpand = sections.some(section => !section.open);
    sections.forEach(section => { section.open = shouldExpand; });
    updateLeagueToggleButton();
}

function refreshCurrentPage() {
    window.location.reload();
}

function scrollToPageTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function initFloatingPageActions() {
    const actions = document.getElementById("floatingPageActions");
    if (!actions) return;
    getLeagueSections().forEach(section => {
        section.addEventListener("toggle", updateLeagueToggleButton);
    });
    updateLeagueToggleButton();
}

window.toggleAllLeagues = toggleAllLeagues;
window.refreshCurrentPage = refreshCurrentPage;
window.scrollToPageTop = scrollToPageTop;
initFloatingPageActions();
`;
