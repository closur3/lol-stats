import { escapeHtml, escapeJsArg } from '../../utils/htmlEscape.js';
import { deleteIconHtml, forceIconHtml } from '../../constants/uiIcons.js';

export function renderActiveTournamentList(activeTournaments = []) {
  const html = activeTournaments.map(activeTournament => {
    const slug = String(activeTournament.slug || "");
    const name = String(activeTournament.name || "");
    return `
      <div class="item">
          <label class="item-left">
              <input type="checkbox" class="item-chk" value="${escapeHtml(slug)}" data-name="${escapeHtml(name)}">
              <span class="item-name">${escapeHtml(name)}</span>
          </label>
          <div class="item-right">
              <button class="icon-btn" onclick="forceOne(${escapeJsArg(slug)}, ${escapeJsArg(name)}, this)" aria-label="Force update ${escapeHtml(name)}">${forceIconHtml}</button>
              <button class="icon-btn icon-btn-del" onclick="deleteActive(${escapeJsArg(slug)}, ${escapeJsArg(name)}, this)" aria-label="Delete active runtime state for ${escapeHtml(name)}">${deleteIconHtml}</button>
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
              <button class="icon-btn" onclick="rebuildArchive(${escapeJsArg(slug)}, ${escapeJsArg(name)}, this)" aria-label="Rebuild archive snapshot for ${escapeHtml(name)}">${forceIconHtml}</button>
              <button class="icon-btn icon-btn-del" onclick="deleteArchive(${escapeJsArg(slug)}, ${escapeJsArg(name)}, this)" aria-label="Delete archive snapshot for ${escapeHtml(name)}">${deleteIconHtml}</button>
          </div>
      </div>`;
  }).join("");
  return html || '<div class="empty-state">No archive</div>';
}
