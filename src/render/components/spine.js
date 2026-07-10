export function renderSplitScore(value, separator) {
  if (!value || value === "-") return `<span class="muted-dash">-</span>`;
  const scoreParts = value.split(separator);
  if (scoreParts.length !== 2) return value;
  return `<div class="spine-row"><span class="spine-l spine-strong">${scoreParts[0]}</span><span class="spine-sep spine-sep-muted">${separator}</span><span class="spine-r spine-strong">${scoreParts[1]}</span></div>`;
}
