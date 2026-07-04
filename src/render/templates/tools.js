import toolsCSS from '../../styles/tools.js';
import { TOOLS_SCRIPT } from '../../client/tools.js';
import { escapeHtml } from '../../utils/htmlEscape.js';
import { renderPageShell } from './page.js';
import { renderActiveTournamentList, renderArchivedTournamentList } from './toolsLists.js';

export function renderToolsPage(time, sha, activeTournaments = [], archivedTournaments = [], archiveError = null, hasActiveCron = false) {
  const activeListHtml = renderActiveTournamentList(activeTournaments);
  const archiveListHtml = renderArchivedTournamentList(archivedTournaments);
  const archiveErrorHtml = archiveError
    ? `<div style="box-sizing:border-box; width:calc(100% - 24px); margin:0 12px 12px; padding:12px 14px; border:1px solid #f97316; border-left:4px solid #f97316; border-radius:12px; color:#fff7ed; background:#431407; font-size:13px; line-height:1.55; box-shadow:0 10px 24px rgba(0,0,0,.18);"><strong style="display:block; color:#fed7aa; font-size:13px; margin-bottom:4px;">Archive index unavailable</strong><span style="color:#ffedd5;">${escapeHtml(archiveError)}</span></div>`
    : "";

  const bodyContent = `
          <div class="wrapper">
              <div class="table-title"><span>⚙️ Operations</span></div>
              <div class="section-body ops-body">

                  <div class="group-header">
                      <input type="checkbox" class="group-chk" id="chk-active-all">
                      <span class="group-label">Active</span>
                  </div>
                  <div id="active-list" class="list">
                      ${activeListHtml}
                  </div>
                  <div class="ops-actions">
                      <button class="primary-btn" onclick="forceSelected()">Force Update</button>
                  </div>

                  <div class="item-sep"></div>

                  <div class="group-header">
                      <input type="checkbox" class="group-chk" id="chk-archived-all">
                      <span class="group-label">Archived</span>
                  </div>
                  <div class="list">
                      ${archiveErrorHtml}
                      ${archiveListHtml}
                  </div>
                  <div class="ops-actions">
                      <button class="primary-btn" onclick="rebuildSelected()">Rebuild</button>
                  </div>

              </div>
          </div>

          <div class="wrapper">
              <div class="table-title">🛠️ Config Index</div>
              <div class="section-body archive-index-body">
                  <div class="archive-index-actions">
                      <button class="index-action-btn index-action-import" onclick="previewConfigAction('tour-import', this)">
                          <span class="index-action-main">Import active config</span>
                          <span class="index-action-meta">config/tour.json → CONFIG_TOUR</span>
                      </button>
                      <button class="index-action-btn index-action-rebuild" onclick="previewConfigAction('archive-rebuild', this)">
                          <span class="index-action-main">Rebuild archive index</span>
                          <span class="index-action-meta">ARCHIVE_* → CONFIG_ARCHIVE</span>
                      </button>
                      <button class="index-action-btn index-action-import" onclick="previewConfigAction('archive-import', this)">
                          <span class="index-action-main">Import archive index</span>
                          <span class="index-action-meta">config/archive.json → CONFIG_ARCHIVE</span>
                      </button>
                  </div>
              </div>
          </div>

          <div class="wrapper">
              <div class="table-title">📦 Manual Archive</div>
              <div class="section-body">
                  <div class="form-grid">
                      <div class="form-group">
                          <label class="tool-label">Slug</label>
                          <input type="text" id="ma-slug" placeholder="lpl-2026-split-1" class="form-input" required>
                      </div>
                      <div class="form-group">
                          <label class="tool-label">Name</label>
                          <input type="text" id="ma-name" placeholder="LPL 2026 Split 1" class="form-input" required>
                      </div>
                      <div class="form-group">
                          <label class="tool-label">Overview Page</label>
                          <input type="text" id="ma-overview" placeholder="LPL/2026 Season/Split 1" class="form-input" required>
                      </div>
                      <div class="form-group">
                          <label class="tool-label">League</label>
                          <input type="text" id="ma-league" placeholder="LPL" class="form-input" required>
                      </div>
                      <div class="form-group">
                          <label class="tool-label">Start Date</label>
                          <input type="text" id="ma-start" placeholder="YYYY-MM-DD" class="form-input" required>
                      </div>
                      <div class="form-group">
                          <label class="tool-label">End Date</label>
                          <input type="text" id="ma-end" placeholder="YYYY-MM-DD" class="form-input" required>
                      </div>
                  </div>
                  <div class="actions-row-end">
                      <button class="primary-btn" onclick="submitManualArchive()">Save Metadata</button>
                  </div>
              </div>
          </div>`;

  const preBody = `<div id="toast-container"></div>
      <div id="config-action-confirm" class="index-confirm-overlay" aria-hidden="true">
          <div class="index-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="indexConfirmTitle">
              <div id="indexConfirmIcon" class="index-confirm-icon">↻</div>
              <div class="index-confirm-content">
                  <h2 id="indexConfirmTitle">Rebuild from ARCHIVE_*</h2>
                  <div id="indexConfirmFlow" class="index-confirm-flow">ARCHIVE_* → CONFIG_ARCHIVE</div>
              </div>
              <div class="index-confirm-actions">
                  <button class="secondary-btn" onclick="closeConfigActionConfirm()">Cancel</button>
                  <button id="indexConfirmSubmit" class="primary-btn" onclick="confirmConfigAction(this)">Confirm</button>
              </div>
          </div>
      </div>
      <div id="auth-overlay">
          <div class="auth-card">
              <div class="auth-icon">🔐</div>
              <input type="password" id="auth-pwd" class="form-input auth-input" placeholder="Password" onkeypress="if(event.key==='Enter') unlockTools()">
              <button class="primary-btn auth-btn" onclick="unlockTools()">Unlock</button>
          </div>
      </div>`;

  return renderPageShell("Tools", bodyContent, "tools", time, sha, hasActiveCron, {
    css: toolsCSS,
    script: `<script>${TOOLS_SCRIPT}</script>`,
    preBody,
    showModal: false
  });
}
