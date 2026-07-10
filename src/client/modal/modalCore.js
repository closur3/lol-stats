export const modalCore = `
const resultIconMap = {
  'WIN': '\\u2705', 
  'LOSS': '\\u274c', 
  'LIVE': '\\ud83d\\udd35', 
  'NEXT': '\\ud83d\\udd52' 
};
const styleDateTime = 'style="font-weight:700;color:#475569"';
const styleScoreDash = 'style="opacity:0.4;margin:0 1px"';
const styleScoreWrap = 'style="width:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center"';
const styleModalEmpty = 'style="text-align:center;color:#999;padding:20px"';
const styleH2hSummary = 'style="color:#94a3b8;font-size:14px"';
const styleH2hDash = 'style="margin:0 1px"';
const styleMutedDash = 'style="color:#cbd5e1"';

function renderMatchItem(viewType, dateDisplay, resultTagHtml, team1Name, team2Name, isFullLength, scoreDisplay, matchResultCode) {
    const dateParts = (dateDisplay || '').split(' ');
    const dateHtml = dateParts.length === 2 
      ? dateParts[0] + '<br><span ' + styleDateTime + '>' + dateParts[1] + '</span>'
      : (dateDisplay || '');

    let matchItemClass = 'match-item';
    if (viewType === 'history') {
        if (matchResultCode === 'WIN') {
            matchItemClass += ' match-win';
        } else if (matchResultCode === 'LOSS') {
            matchItemClass += ' match-loss';
        }
    }

    let scoreContent = '', scoreClass = 'score-text';
    if (matchResultCode === 'LIVE') scoreClass += ' live';
    if (matchResultCode === 'NEXT') { 
      scoreContent = '<span class="score-text vs">VS</span>'; 
    } else { 
      const formattedScore = (scoreDisplay || '').toString().replace('-', '<span ' + styleScoreDash + '>-</span>');
      scoreContent = '<span class="' + scoreClass + '">' + formattedScore + '</span>'; 
    }
    const boxClass = isFullLength ? 'score-box is-full' : 'score-box';
    const team1Style = team1Name === 'TBD' ? 'style="padding-right:5px;color:#9ca3af !important;"' : 'style="padding-right:5px;"';
    const team2Style = team2Name === 'TBD' ? 'style="padding-left:5px;color:#9ca3af !important;"' : 'style="padding-left:5px;"';

    return '<div class="' + matchItemClass + '">' +
           '<div class="col-date">' + dateHtml + '</div>' +
           '<div class="modal-divider"></div>' +
           '<div class="col-vs-area"><div class="spine-row">' +
           '<span class="spine-l" ' + team1Style + '>' + team1Name + '</span>' +
           '<div ' + styleScoreWrap + '><div class="' + boxClass + '">' + scoreContent + '</div></div>' +
           '<span class="spine-r" ' + team2Style + '>' + team2Name + '</span>' +
           '</div></div>' +
           '<div class="modal-divider"></div>' +
           '<div class="col-res">' + resultTagHtml + '</div>' +
           '</div>';
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
