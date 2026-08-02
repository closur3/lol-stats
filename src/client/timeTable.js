export const timeTableScript = `
function readTimeCellMatches(cellElement) {
    const rawMatches = cellElement.dataset.matches;
    if (rawMatches == null) throw new Error("time table cell matches missing");
    const matches = JSON.parse(rawMatches);
    if (!Array.isArray(matches)) throw new Error("time table cell matches must be an array");
    return matches;
}

function filterTimeMatches(matches, timeFilter) {
    if (timeFilter === "all") return matches;
    if (timeFilter.startsWith("bestOf:")) {
        const bestOf = Number(timeFilter.slice("bestOf:".length));
        if (!Number.isInteger(bestOf) || bestOf <= 0) throw new Error("time table best-of filter invalid");
        return matches.filter(match => match.bestOf === bestOf);
    }
    if (timeFilter.startsWith("tab:")) {
        const tabIdentity = JSON.parse(timeFilter.slice("tab:".length));
        if (!Array.isArray(tabIdentity) || tabIdentity.length !== 2 || tabIdentity.some(value => typeof value !== "string" || !value)) {
            throw new Error("time table tab filter invalid");
        }
        return matches.filter(match => match.overviewPage === tabIdentity[0] && match.tabName === tabIdentity[1]);
    }
    throw new Error("time table filter invalid");
}

function renderTimeCellValue(cellElement, matches) {
    const totalMatchCount = matches.length;
    cellElement.classList.toggle("is-empty", totalMatchCount === 0);
    if (totalMatchCount === 0) {
        cellElement.style.background = "";
        cellElement.removeAttribute("onclick");
        cellElement.innerHTML = '<span class="time-empty">-</span>';
        return;
    }

    const fullLengthMatchCount = matches.filter(match => match.isFullLength).length;
    const fullRate = fullLengthMatchCount / totalMatchCount;
    cellElement.style.background = colorRate(fullRate);
    cellElement.setAttribute("onclick", "showTimeCellPopup(this)");
    cellElement.innerHTML = '<div class="t-cell"><span class="t-val">' + fullLengthMatchCount + '<span style="opacity:0.4; margin:0 1px;">/</span>' + totalMatchCount + '</span><span class="t-pct">(' + Math.round(fullRate * 100) + '%)</span></div>';
}

function colorRate(rate) {
    const normalizedRate = Math.max(0, Math.min(1, rate));
    const hue = parseInt((1 - normalizedRate) * 140);
    return 'hsl(' + hue + ', 55%, 50%)';
}

function applyTimeFilter(filterOption) {
    if (!(filterOption instanceof HTMLButtonElement)) throw new Error("time filter option invalid");
    const tableBlock = filterOption.closest(".time-table-block");
    if (!tableBlock) throw new Error("time table block missing");
    const timeFilter = filterOption.dataset.timeFilterValue;
    if (!timeFilter) throw new Error("time table filter missing");
    const filterLabel = filterOption.dataset.timeFilterLabel;
    if (!filterLabel) throw new Error("time table filter label missing");
    tableBlock.dataset.timeFilter = timeFilter;

    const triggerLabel = tableBlock.querySelector(".compact-menu-value");
    if (!triggerLabel) throw new Error("time filter trigger label missing");
    triggerLabel.textContent = filterLabel;
    tableBlock.querySelectorAll(".compact-menu-option").forEach(option => {
        const isSelected = option === filterOption;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-selected", String(isSelected));
    });

    tableBlock.querySelectorAll(".time-table-cell").forEach(cellElement => {
        const matches = filterTimeMatches(readTimeCellMatches(cellElement), timeFilter);
        renderTimeCellValue(cellElement, matches);
    });
    closeCompactMenus();
}

function showTimeCellPopup(cellElement) {
    const tableBlock = cellElement.closest(".time-table-block");
    if (!tableBlock) throw new Error("time table block missing");
    const timeFilter = tableBlock.dataset.timeFilter;
    if (!timeFilter) throw new Error("time table filter missing");
    const matches = filterTimeMatches(readTimeCellMatches(cellElement), timeFilter);
    showPopup(cellElement.dataset.title, Number(cellElement.dataset.dayIndex), matches);
}

window.applyTimeFilter = applyTimeFilter;
window.showTimeCellPopup = showTimeCellPopup;
`;
