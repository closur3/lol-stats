export const TIME_TABLE_SCRIPT = `
function readTimeCellMatches(cellElement) {
    const rawMatches = cellElement.dataset.matches;
    if (rawMatches == null) throw new Error("time table cell matches missing");
    const matches = JSON.parse(rawMatches);
    if (!Array.isArray(matches)) throw new Error("time table cell matches must be an array");
    return matches;
}

function filterTimeMatches(matches, boxFilter) {
    if (boxFilter === "all") return matches;
    const bestOf = Number(boxFilter);
    return matches.filter(match => match.bestOf === bestOf);
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

function applyTimeBoxFilter(filterElement) {
    const tableBlock = filterElement.closest(".time-table-block");
    if (!tableBlock) throw new Error("time table block missing");
    const boxFilter = filterElement.value;
    if (!boxFilter) throw new Error("time table box filter missing");
    tableBlock.dataset.boxFilter = boxFilter;

    tableBlock.querySelectorAll(".time-box-select").forEach(selectElement => {
        selectElement.value = boxFilter;
    });

    tableBlock.querySelectorAll(".time-table-cell").forEach(cellElement => {
        const matches = filterTimeMatches(readTimeCellMatches(cellElement), boxFilter);
        renderTimeCellValue(cellElement, matches);
    });
}

function showTimeCellPopup(cellElement) {
    const tableBlock = cellElement.closest(".time-table-block");
    if (!tableBlock) throw new Error("time table block missing");
    const boxFilter = tableBlock.dataset.boxFilter || "all";
    const matches = filterTimeMatches(readTimeCellMatches(cellElement), boxFilter);
    showPopup(cellElement.dataset.title, Number(cellElement.dataset.dayIndex), matches);
}

window.applyTimeBoxFilter = applyTimeBoxFilter;
window.showTimeCellPopup = showTimeCellPopup;
`;
