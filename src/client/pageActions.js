export const pageActionsScript = `
const floatingActionsFooterGap = 12;

function getTournamentSections() {
    return Array.from(document.querySelectorAll("section.home-sec"));
}

function readTournamentTitle(section) {
    const title = section.querySelector(".tournament-title-text");
    if (!title) throw new Error("Tournament title missing");
    return title.textContent.trim();
}

function updateTournamentJumpCurrent() {
    const sections = getTournamentSections();
    const menu = document.getElementById("tournamentJump");
    if (!menu || sections.length === 0) return;
    const currentIndex = Math.max(0, sections.findLastIndex(section => section.getBoundingClientRect().top <= 96));
    const currentTitle = readTournamentTitle(sections[currentIndex]);
    const trigger = menu.querySelector(".tournament-jump-trigger");
    if (!trigger) throw new Error("Tournament jump trigger missing");
    trigger.setAttribute("aria-label", "Jump to tournament: " + currentTitle);
    menu.querySelectorAll(".tournament-jump-option").forEach((option, index) => {
        option.classList.toggle("is-current", index === currentIndex);
        option.setAttribute("aria-current", String(index === currentIndex));
    });
}

function jumpToTournament(section, index) {
    if (index === 0) {
        scrollToPageTop();
        closeCompactMenus();
        return;
    }
    const top = section.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    closeCompactMenus();
}

function initTournamentJump() {
    const menu = document.getElementById("tournamentJump");
    if (!menu) return;
    const trigger = menu.querySelector(".tournament-jump-trigger");
    const popup = menu.querySelector(".tournament-jump-menu");
    if (!trigger || !popup) throw new Error("Tournament jump structure invalid");
    const sections = getTournamentSections();
    if (sections.length === 0) return;
    sections.forEach((section, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "tournament-jump-option compact-menu-option";
        option.setAttribute("role", "option");
        option.textContent = readTournamentTitle(section);
        option.addEventListener("click", () => jumpToTournament(section, index));
        popup.append(option);
    });
    trigger.disabled = false;
    let closeTimeout = 0;
    const clearCloseTimeout = () => {
        window.clearTimeout(closeTimeout);
        closeTimeout = 0;
    };
    const openMenu = () => {
        clearCloseTimeout();
        syncTournamentJumpMobilePosition();
        if (!menu.classList.contains("is-open")) toggleCompactMenu(trigger);
    };
    const scheduleClose = () => {
        clearCloseTimeout();
        closeTimeout = window.setTimeout(() => closeCompactMenus(), 180);
    };
    trigger.addEventListener("mouseenter", openMenu);
    trigger.addEventListener("mouseleave", scheduleClose);
    popup.addEventListener("mouseenter", clearCloseTimeout);
    popup.addEventListener("mouseleave", scheduleClose);
    syncTournamentJumpMobilePosition();
    updateTournamentJumpCurrent();
}

function refreshCurrentPage() {
    window.location.reload();
}

function scrollToPageTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function jumpToSchedule() {
    const schedule = document.getElementById("scheduleSection");
    if (!schedule) throw new Error("Schedule section missing");
    const top = schedule.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
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

function syncTournamentJumpMobilePosition() {
    const menu = document.getElementById("tournamentJump");
    if (!menu) return;
    const popup = menu.querySelector(".tournament-jump-menu");
    if (!popup) throw new Error("Tournament jump menu missing");
    if (!window.matchMedia("(max-width: 650px)").matches) {
        popup.style.left = "";
        popup.style.transform = "";
        return;
    }
    popup.style.left = (window.innerWidth / 2) - menu.getBoundingClientRect().left + "px";
    popup.style.transform = "translateX(-50%)";
}

function bindFloatingActionsMobilePosition() {
    let pendingFrame = 0;
    const scheduleSync = () => {
        if (pendingFrame) return;
        pendingFrame = window.requestAnimationFrame(() => {
            pendingFrame = 0;
            syncFloatingActionsMobilePosition();
            syncTournamentJumpMobilePosition();
            updateTournamentJumpCurrent();
        });
    };
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    scheduleSync();
}

function initFloatingPageActions() {
    const actions = document.getElementById("floatingPageActions");
    if (!actions) return;
    initTournamentJump();
    bindFloatingActionsMobilePosition();
}

window.refreshCurrentPage = refreshCurrentPage;
window.scrollToPageTop = scrollToPageTop;
window.jumpToSchedule = jumpToSchedule;
initFloatingPageActions();
`;
