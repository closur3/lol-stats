export const pageActionsScript = `
const floatingActionsFooterGap = 12;

function getTournamentSections() {
    return Array.from(document.querySelectorAll("details.home-sec"));
}

function updateTournamentToggleButton() {
    const button = document.getElementById("floatingToggleTournaments");
    if (!button) return;
    const sections = getTournamentSections();
    if (sections.length === 0) {
        button.disabled = true;
        button.setAttribute("aria-label", "No tournaments");
        button.dataset.actionState = "disabled";
        return;
    }
    const hasClosedSection = sections.some(section => !section.open);
    button.disabled = false;
    button.dataset.actionState = hasClosedSection ? "expand" : "collapse";
    button.setAttribute("aria-label", hasClosedSection ? "Expand all tournaments" : "Collapse all tournaments");
}

function toggleAllTournaments() {
    const sections = getTournamentSections();
    const shouldExpand = sections.some(section => !section.open);
    sections.forEach(section => { section.open = shouldExpand; });
    updateTournamentToggleButton();
    syncFloatingActionsMobilePosition();
}

function refreshCurrentPage() {
    window.location.reload();
}

function scrollToPageTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetFloatingActionsPosition(actions) {
    actions.style.top = "";
    actions.style.bottom = "";
    actions.style.transform = "";
}

function syncFloatingActionsMobilePosition() {
    const actions = document.getElementById("floatingPageActions");
    if (!actions) return;
    if (!window.matchMedia("(max-width: 650px)").matches) {
        resetFloatingActionsPosition(actions);
        return;
    }
    const footer = document.querySelector(".build-footer");
    if (!footer) {
        resetFloatingActionsPosition(actions);
        return;
    }
    const footerBox = footer.getBoundingClientRect();
    if (footerBox.top < window.innerHeight) {
        const actionsBox = actions.getBoundingClientRect();
        const centerY = footerBox.top - floatingActionsFooterGap - (actionsBox.height / 2);
        actions.style.top = centerY + "px";
        actions.style.bottom = "auto";
        actions.style.transform = "translate(-50%, -50%)";
        return;
    }
    resetFloatingActionsPosition(actions);
}

function bindFloatingActionsMobilePosition() {
    let pendingFrame = 0;
    const scheduleSync = () => {
        if (pendingFrame) return;
        pendingFrame = window.requestAnimationFrame(() => {
            pendingFrame = 0;
            syncFloatingActionsMobilePosition();
        });
    };
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    scheduleSync();
}

function initFloatingPageActions() {
    const actions = document.getElementById("floatingPageActions");
    if (!actions) return;
    getTournamentSections().forEach(section => {
        section.addEventListener("toggle", () => {
            updateTournamentToggleButton();
            syncFloatingActionsMobilePosition();
        });
    });
    updateTournamentToggleButton();
    bindFloatingActionsMobilePosition();
}

window.toggleAllTournaments = toggleAllTournaments;
window.refreshCurrentPage = refreshCurrentPage;
window.scrollToPageTop = scrollToPageTop;
initFloatingPageActions();
`;
