export const modalCore = `
const resultLabelMap = {
  'WIN': 'WIN',
  'LOSS': 'LOSS',
  'DRAW': 'DRAW',
  'LIVE': 'LIVE',
  'NEXT': 'NEXT'
};
const styleModalEmpty = 'style="text-align:center;color:#999;padding:20px"';

function escapeModalHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
}

function setModalTitle(contextLabel, titleParts) {
    if (typeof contextLabel !== 'string' || contextLabel.length === 0) {
        throw new Error('Modal context label is required');
    }
    if (!Array.isArray(titleParts) || titleParts.length === 0) {
        throw new Error('Modal title parts are required');
    }

    const titleHtml = titleParts.map(part => {
        if (!part || typeof part.kind !== 'string') throw new Error('Invalid modal title part');
        if (part.kind === 'text') {
            if (typeof part.text !== 'string' || part.text.length === 0) throw new Error('Invalid modal title text');
            return '<span>' + escapeModalHtml(part.text) + '</span>';
        }
        if (part.kind === 'divider') {
            if (part.text !== '·') throw new Error('Invalid modal title divider');
            return '<span class="modal-context-divider">·</span>';
        }
        if (part.kind === 'record') {
            const separator = part.separator;
            if (separator !== '-' && separator !== '/') throw new Error('Invalid modal title record separator');
            const recordPattern = separator === '-' ? /^(\\d+)-(\\d+)$/ : /^(\\d+)\\/(\\d+)$/;
            const recordMatch = String(part.value).match(recordPattern);
            if (!recordMatch) throw new Error('Invalid modal title record: ' + part.value);
            const prefix = part.prefix == null ? '' : part.prefix;
            if (typeof prefix !== 'string') throw new Error('Invalid modal title record prefix');
            return '<span class="modal-title-record">' + escapeModalHtml(prefix) + recordMatch[1] +
                '<span class="score-sep">' + separator + '</span>' + recordMatch[2] + '</span>';
        }
        throw new Error('Unknown modal title part kind: ' + part.kind);
    }).join('');

    document.getElementById('modalTitle').innerHTML =
        '<span class="modal-context-label">' + escapeModalHtml(contextLabel) + '</span>' +
        '<span class="modal-context-title">' + titleHtml + '</span>';
}

function renderGameResults(gameResults) {
    if (!Array.isArray(gameResults)) return '';
    if (gameResults.length === 0) throw new Error('Game results cannot be empty');
    const resultHtml = gameResults.map(result => {
        if (result !== 'W' && result !== 'L') throw new Error('Invalid game result: ' + result);
        const resultClass = result === 'W' ? 'game-result-win' : 'game-result-loss';
        return '<span class="game-result ' + resultClass + '">' + result + '</span>';
    }).join('');
    return '<div class="game-results">' + resultHtml + '</div>';
}

function renderMatchDetails(match) {
    const hasGameResults = Array.isArray(match.gameResults);
    if (match.turnaroundType != null && !hasGameResults) {
        throw new Error('Turnaround event requires game results');
    }

    const gameResultsHtml = renderGameResults(match.gameResults);
    const turnaroundHtml = renderTurnaroundTag(match.turnaroundType, match.matchResultCode);
    if (!gameResultsHtml && !turnaroundHtml) return '';

    const layoutClass = turnaroundHtml ? 'has-turnaround' : 'game-only';
    return '<div class="match-details ' + layoutClass + '">' + gameResultsHtml + turnaroundHtml + '</div>';
}

function renderTurnaroundTag(turnaroundType, matchResultCode) {
    if (turnaroundType == null) return '';
    if (matchResultCode !== 'WIN' && matchResultCode !== 'LOSS') {
        throw new Error('Turnaround event requires a finished series');
    }

    const isWin = matchResultCode === 'WIN';
    if (turnaroundType === 'leadChange') {
        const label = isWin ? 'COME BACK' : 'LOST LEAD';
        const icon = isWin
            ? '<svg viewBox="0 0 24 24"><path d="m3 17 6-6 4 4 8-8"></path><path d="M14 7h7v7"></path></svg>'
            : '<svg viewBox="0 0 24 24"><path d="m3 7 6 6 4-4 8 8"></path><path d="M14 17h7v-7"></path></svg>';
        const className = isWin ? 'turnaround-comeback' : 'turnaround-lost-lead';
        return renderTurnaroundBadge(icon, label, className);
    }
    if (turnaroundType === 'reverseSweep') {
        const label = isWin ? 'REVERSE SWEEP' : 'REVERSE SWEPT';
        const icon = isWin
            ? '<svg viewBox="0 0 24 24"><path d="M12 22c4.4 0 8-3.1 8-7.5 0-3.1-1.7-5.8-4-7.5 0 2-1 3.5-2.5 4.5.2-4-2.5-7.5-5.5-9.5.3 4.2-4 7-4 12.5C4 18.9 7.6 22 12 22Z"></path><path d="M9 16c0 1.7 1.3 3 3 3s3-1.3 3-3c0-1.3-.7-2.4-1.7-3.2 0 1-.5 1.7-1.3 2.2-.1-1.8-1.1-3.3-2.3-4.4.1 2.3-.7 3.5-.7 5.4Z"></path></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M12 3c.3 3-2.8 4.4-2.8 7.4 0 1.8 1.3 3.1 2.8 3.1s2.8-1.3 2.8-3.1c0-1.4-.6-2.7-1.5-3.8 2.7 1.3 4.5 3.7 4.5 6.5 0 3.2-2.6 5.4-5.8 5.4s-5.8-2.2-5.8-5.4C6.2 8.9 10 6.8 12 3Z"></path><path d="m6 18-2 2"></path><path d="M12 20v2"></path><path d="m18 18 2 2"></path></svg>';
        const className = isWin ? 'turnaround-reverse-sweep' : 'turnaround-reverse-swept';
        return renderTurnaroundBadge(icon, label, className);
    }
    throw new Error('Unknown turnaround type: ' + turnaroundType);
}

function renderTurnaroundBadge(icon, label, className) {
    return '<div class="turnaround-event"><span class="turnaround-badge ' + className + '">' +
        '<span class="turnaround-icon" aria-hidden="true">' + icon + '</span>' + label + '</span></div>';
}

function renderMatchCard(match, detailsHtml = '', resultTagHtml = '') {
    const dateParts = String(match.dateDisplay).split(' ');
    if (dateParts.length !== 2) throw new Error('Invalid match card date display: ' + match.dateDisplay);
    if (!Number.isInteger(match.bestOf) || match.bestOf < 1) throw new Error('Invalid match card bestOf: ' + match.bestOf);
    if (!resultLabelMap[match.matchResultCode]) throw new Error('Invalid match card result code: ' + match.matchResultCode);

    let leftResultClass = '';
    let rightResultClass = '';
    if (match.matchResultCode === 'WIN') {
        leftResultClass = ' match-card-team-winner';
        rightResultClass = ' match-card-team-loser';
    } else if (match.matchResultCode === 'LOSS') {
        leftResultClass = ' match-card-team-loser';
        rightResultClass = ' match-card-team-winner';
    }

    let scoreHtml;
    if (match.matchResultCode === 'NEXT') {
        scoreHtml = '<span class="match-card-vs">VS</span>';
    } else {
        const scoreDisplay = String(match.scoreDisplay);
        if (!/^\\d+-\\d+$/.test(scoreDisplay)) throw new Error('Invalid match card score: ' + scoreDisplay);
        const scoreClass = match.matchResultCode === 'LIVE' ? 'match-card-score is-live' : 'match-card-score';
        scoreHtml = '<span class="' + scoreClass + '">' + escapeModalHtml(scoreDisplay).replace('-', '<span class="score-sep">-</span>') + '</span>' +
            (match.isForfeit ? '<span class="match-forfeit">FF</span>' : '');
    }

    const bestOfTag = '<span class="best-of-pill bo' + match.bestOf + '">BO' + match.bestOf + '</span>';
    const scoreBoxClass = match.isFullLength ? 'match-card-score-box is-full' : 'match-card-score-box';
    return '<div class="match-item match-card">' +
        '<div class="match-card-meta"><span>' + escapeModalHtml(dateParts[0]) + '<b>' + escapeModalHtml(dateParts[1]) + '</b></span>' +
        '<span class="match-card-tags">' + resultTagHtml + bestOfTag + '</span></div>' +
        '<div class="match-card-fixture">' +
        '<span class="match-card-team match-card-team-left' + leftResultClass + '">' + escapeModalHtml(match.leftTeamName) + '</span>' +
        '<span class="' + scoreBoxClass + '">' + scoreHtml + '</span>' +
        '<span class="match-card-team match-card-team-right' + rightResultClass + '">' + escapeModalHtml(match.rightTeamName) + '</span>' +
        '</div>' + detailsHtml + '</div>';
}

function renderListHTML(htmlArray) {
    const modalList = document.getElementById('modalList');
    if(!htmlArray || htmlArray.length === 0) {
      modalList.innerHTML = "<div " + styleModalEmpty + ">No matches found</div>";
    } else {
      modalList.innerHTML = htmlArray.join("");
    }
}
`;
