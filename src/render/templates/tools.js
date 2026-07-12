import toolsCSS from '../../styles/tools.js';
import { toolsScript } from '../../client/tools.js';
import { escapeHtml } from '../../utils/htmlEscape.js';
import { renderPageShell } from './page.js';
import { renderActiveTournamentList, renderArchivedTournamentList } from './toolsLists.js';

const toolsAuthScript = `
<script>
  const authForm = document.getElementById("tools-auth-form");
  const authInput = document.getElementById("auth-pwd");
  const authButton = document.getElementById("auth-submit");

  function shakeAuthInput() {
    authInput.classList.remove("auth-input-error");
    void authInput.offsetWidth;
    authInput.classList.add("auth-input-error");
    authInput.focus();
    authInput.select();
  }

  authForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    const password = authInput.value;
    if (!password) {
      shakeAuthInput();
      return;
    }
    authButton.disabled = true;
    try {
      const response = await fetch("/tools/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (response.ok) {
        window.location.href = "/tools";
        return;
      }
      shakeAuthInput();
    } catch (_error) {
      shakeAuthInput();
    } finally {
      authButton.disabled = false;
    }
  });
</script>`;

export function renderToolsAuthPage(time, sha) {
  const preBody = `
      <div id="auth-overlay">
          <form id="tools-auth-form" class="auth-card" autocomplete="off">
              <div class="auth-icon">🔐</div>
              <input type="password" id="auth-pwd" class="form-input auth-input" placeholder="Password" autofocus>
              <button id="auth-submit" class="primary-btn auth-btn" type="submit">Unlock</button>
          </form>
      </div>`;

  return renderPageShell("Tools", "", "tools", time, sha, false, {
    css: toolsCSS,
    script: toolsAuthScript,
    preBody,
    showModal: false
  });
}

export function renderToolsPage(time, sha, activeTournaments = [], archivedTournaments = [], archiveError = null, hasActiveCron = false) {
  const activeListHtml = renderActiveTournamentList(activeTournaments);
  const archiveListHtml = renderArchivedTournamentList(archivedTournaments);
  const archiveErrorHtml = archiveError
    ? `<div class="tools-error-alert"><strong>Archive index unavailable</strong><span>${escapeHtml(archiveError)}</span></div>`
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
                      <button class="secondary-btn" onclick="runWorkerCron(this)">Run Cron</button>
                      <button class="primary-btn" onclick="forceSelected(this)">Force Update</button>
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
                      <button class="primary-btn" onclick="rebuildSelected(this)">Rebuild</button>
                  </div>

              </div>
          </div>`;

  const preBody = `<div id="toast-container"></div>
      <div id="config-action-confirm" class="index-confirm-overlay" aria-hidden="true">
          <div class="index-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="indexConfirmTitle">
              <div id="indexConfirmIcon" class="index-confirm-icon">↻</div>
              <div class="index-confirm-content">
                  <h2 id="indexConfirmTitle">Confirm operation</h2>
                  <div id="indexConfirmFlow" class="index-confirm-flow"></div>
              </div>
              <div class="index-confirm-actions">
                  <button class="secondary-btn" onclick="closeConfigActionConfirm()">Cancel</button>
                  <button id="indexConfirmSubmit" class="primary-btn" onclick="confirmConfigAction(this)">Confirm</button>
              </div>
          </div>
      </div>
      `;

  return renderPageShell("Tools", bodyContent, "tools", time, sha, hasActiveCron, {
    css: toolsCSS,
    script: `<script>${toolsScript}</script>`,
    preBody,
    showModal: false
  });
}
