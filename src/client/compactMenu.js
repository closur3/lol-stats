export const compactMenuScript = `
function closeCompactMenus() {
    document.querySelectorAll(".compact-menu.is-open").forEach(menu => {
        menu.classList.remove("is-open");
        const trigger = menu.querySelector(".compact-menu-trigger");
        const popup = menu.querySelector(".compact-menu-popup");
        if (!trigger || !popup) throw new Error("compact menu structure invalid");
        trigger.setAttribute("aria-expanded", "false");
        popup.setAttribute("aria-hidden", "true");
    });
}

function toggleCompactMenu(trigger) {
    if (!(trigger instanceof HTMLButtonElement)) throw new Error("compact menu trigger invalid");
    const menu = trigger.closest(".compact-menu");
    if (!menu) throw new Error("compact menu missing");
    const popup = menu.querySelector(".compact-menu-popup");
    if (!popup) throw new Error("compact menu popup missing");
    const shouldOpen = !menu.classList.contains("is-open");
    closeCompactMenus();
    if (typeof closeTournamentInfoPanels === "function") closeTournamentInfoPanels();
    if (!shouldOpen) return;
    menu.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    popup.setAttribute("aria-hidden", "false");
}

document.addEventListener("click", event => {
    if (!(event.target instanceof Element) || !event.target.closest(".compact-menu")) closeCompactMenus();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeCompactMenus();
});
window.closeCompactMenus = closeCompactMenus;
window.toggleCompactMenu = toggleCompactMenu;
`;
