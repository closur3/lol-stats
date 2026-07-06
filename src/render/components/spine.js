export function mkSpine(val, sep) {
  if (!val || val === "-") return `<span class="muted-dash">-</span>`;
  const parts = val.split(sep);
  if (parts.length !== 2) return val;
  return `<div class="spine-row"><span class="spine-l spine-strong">${parts[0]}</span><span class="spine-sep spine-sep-muted">${sep}</span><span class="spine-r spine-strong">${parts[1]}</span></div>`;
}
