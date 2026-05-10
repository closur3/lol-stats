export const MODAL_TIME = `
function parseUtcString(utc) {
    if (!utc) return null;
    var timestamp = Number(utc);
    if (!isNaN(timestamp) && timestamp > 0) return new Date(timestamp);
    if (/^\\\\d{4}-\\\\d{2}-\\\\d{2}T/.test(utc)) {
        var parsedDate = new Date(utc.includes('Z') ? utc : utc + 'Z');
        if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
    var clean = utc.replace('T', ' ');
    var parts = clean.match(/(\\\\d{2})-(\\\\d{2})-(\\\\d{2})\\\\s+(\\\\d{2}):(\\\\d{2})(?::(\\\\d{2}))?/);
    if (parts) {
        return new Date(Date.UTC(2000 + parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6] || 0)));
    }
    return null;
}

function convertUtcToLocal(el) {
    var utc = el.getAttribute('data-utc');
    if (!utc) return;
    
    var date = parseUtcString(utc);
    if (!date) return;
    
    var format = el.getAttribute('data-format') || 'datetime';
    var hour = pad(date.getHours());
    var minute = pad(date.getMinutes());
    
    if (format === 'time') {
        el.textContent = hour + ":" + minute;
    }
}
`;
