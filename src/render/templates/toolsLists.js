import { escapeHtml, escapeJsArg } from '../../utils/htmlEscape.js';

const FORCE_ICON = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15 6.7"/><path d="M3 12a9 9 0 0 1 15-6.7"/><path d="M18 2v5h-5"/><path d="M6 22v-5h5"/></svg>';
const DELETE_ICON = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';

export function renderActiveTournamentList(activeTournaments = []) {
  const html = activeTournaments.map(activeTournament => {
    const slug = String(activeTournament.slug || "");
    const name = String(activeTournament.name || "");
    return `
      <div class="item">
          <label class="item-left">
              <input type="checkbox" class="item-chk" value="${escapeHtml(slug)}">
              <span class="item-name">${escapeHtml(name)}</span>
          </label>
          <div class="item-right">
              <button class="icon-btn" onclick="forceOne(${escapeJsArg(slug)}, this)" aria-label="Force update ${escapeHtml(name)}">${FORCE_ICON}</button>
              <button class="icon-btn icon-btn-del" onclick="deleteActive(${escapeJsArg(slug)}, ${escapeJsArg(name)}, this)" aria-label="Delete active runtime state for ${escapeHtml(name)}">${DELETE_ICON}</button>
          </div>
      </div>`;
  }).join("");
  return html || '<div class="empty-state">No active</div>';
}

export function renderArchivedTournamentList(archivedTournaments = []) {
  const html = archivedTournaments.map(archiveTournament => {
    const slug = String(archiveTournament.slug || "");
    const name = String(archiveTournament.name || "");
    return `
      <div class="item">
          <label class="item-left">
              <input type="checkbox" class="item-chk qr-chk-archived" value="${escapeHtml(slug)}" data-name="${escapeHtml(name)}">
              <span class="item-name">${escapeHtml(name)}</span>
          </label>
          <div class="item-right">
              <button class="icon-btn icon-btn-del" onclick="deleteArchive(${escapeJsArg(slug)}, ${escapeJsArg(name)}, this)" aria-label="Delete archive snapshot for ${escapeHtml(name)}">${DELETE_ICON}</button>
          </div>
      </div>`;
  }).join("");
  return html || '<div class="empty-state">No archive</div>';
}
