export const TOOLS_BOOTSTRAP = `
          var authOverlay = document.getElementById("auth-overlay");
          var authPwdInput = document.getElementById("auth-pwd");
          var toastContainer = document.getElementById("toast-container");
          var TOAST_DURATION_MS = 3000;
          var REDIRECT_DELAY_MS = 1500;
          var AUTH_ERROR_MSG = "🔒 Session expired or incorrect password.";
          var NETWORK_ERROR_MSG = "❌ Network connection failed";
          var adminToken = sessionStorage.getItem("admin_pwd") || "";
          if (adminToken) authOverlay.style.display = "none";

          document.getElementById('chk-active-all').addEventListener('change', function() {
              document.querySelectorAll('#active-list .item-chk').forEach(function(checkboxElement) { checkboxElement.checked = this.checked; }.bind(this));
          });
          document.getElementById('chk-archived-all').addEventListener('change', function() {
              document.querySelectorAll('.qr-chk-archived').forEach(function(checkboxElement) { checkboxElement.checked = this.checked; }.bind(this));
          });

          function setAuthOverlayVisible(visible) { authOverlay.style.display = visible ? "flex" : "none"; }
          function clearAuth() { sessionStorage.removeItem("admin_pwd"); adminToken = ""; authPwdInput.value = ""; setAuthOverlayVisible(true); }
          function showToast(message, type) {
              type = type || 'success';
              var toast = document.createElement('div');
              toast.className = 'toast ' + type; toast.innerText = message;
              toastContainer.appendChild(toast); void toast.offsetWidth; toast.classList.add('show');
              setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, TOAST_DURATION_MS);
          }
          function unlockTools() { var password = authPwdInput.value.trim(); if (password) { adminToken = password; sessionStorage.setItem('admin_pwd', password); setAuthOverlayVisible(false); } }
          function checkAuthError(status) { if (status === 401) { showToast(AUTH_ERROR_MSG, "error"); clearAuth(); return true; } return false; }
          function requireAuth() { if (adminToken) return true; setAuthOverlayVisible(true); return false; }
          function getAuthHeaders(extra) { return Object.assign({ 'Authorization': 'Bearer ' + adminToken }, extra || {}); }
          function setButtonBusy(button, busyText) {
              var originalText = button.innerHTML; button.innerHTML = busyText; button.style.pointerEvents = 'none'; button.style.opacity = '0.7';
              return function() { button.innerHTML = originalText; button.style.pointerEvents = 'auto'; button.style.opacity = '1'; };
          }
          function sendAuthorizedPost(url, extraHeaders, body) {
              return fetch(url, { method: 'POST', headers: getAuthHeaders(extraHeaders), body: body });
          }
          function showResult(ok, text) { showToast(text, ok ? 'success' : 'error'); }
          var pendingConfigAction = null;
          var pendingConfigActionButton = null;
          var pendingConfigActionPayload = null;
          function getConfigActionMeta(action, payload) {
              payload = payload || {};
              var actions = {
                  'archive-rebuild': {
                      label: 'Rebuild from ARCHIVE_*',
                      flow: 'ARCHIVE_* → CONFIG_ARCHIVE',
                      icon: '↻',
                      url: '/rebuild-archive-index',
                      busyText: 'Rebuilding...',
                      submitText: 'Rebuild',
                      doneText: 'Rebuilt archive index'
                  },
                  'archive-import': {
                      label: 'Import from GitHub backup',
                      flow: 'config/archive.json → CONFIG_ARCHIVE',
                      icon: '⇣',
                      url: '/import-archive-index',
                      busyText: 'Importing...',
                      submitText: 'Import',
                      doneText: 'Imported archive index'
                  },
                  'active-runtime-delete': {
                      label: 'Delete active runtime state',
                      flow: 'Target: ' + (payload.name || payload.slug || 'Active tournament'),
                      icon: '!',
                      url: '/delete-active',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ slug: payload.slug }),
                      busyText: 'Deleting...',
                      submitText: 'Delete',
                      doneText: 'Deleted active runtime state'
                  },
                  'archive-delete': {
                      label: 'Delete archive snapshot',
                      flow: 'Target: ' + (payload.name || payload.slug || 'Archive tournament'),
                      icon: '!',
                      url: '/delete-archive',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ slug: payload.slug, name: payload.name }),
                      busyText: 'Deleting...',
                      submitText: 'Delete',
                      doneText: 'Deleted archive snapshot'
                  }
              };
              return actions[action] || null;
          }
          function closeConfigActionConfirm() {
              pendingConfigAction = null;
              pendingConfigActionButton = null;
              pendingConfigActionPayload = null;
              var overlay = document.getElementById('config-action-confirm');
              overlay.classList.remove('open');
              overlay.setAttribute('aria-hidden', 'true');
          }
          function previewConfigAction(action, button, payload) {
              if (!requireAuth()) return;
              var meta = getConfigActionMeta(action, payload);
              if (!meta) { showResult(false, '❌ Unknown config action'); return; }
              pendingConfigAction = action;
              pendingConfigActionButton = button;
              pendingConfigActionPayload = payload || null;
              document.getElementById('indexConfirmIcon').textContent = meta.icon;
              document.getElementById('indexConfirmTitle').textContent = meta.label;
              document.getElementById('indexConfirmFlow').textContent = meta.flow;
              document.getElementById('indexConfirmSubmit').textContent = meta.submitText;
              var overlay = document.getElementById('config-action-confirm');
              overlay.classList.add('open');
              overlay.setAttribute('aria-hidden', 'false');
          }
          function confirmConfigAction(button) {
              if (!pendingConfigAction) return;
              var meta = getConfigActionMeta(pendingConfigAction, pendingConfigActionPayload);
              if (!meta) return;
              var restoreConfirm = setButtonBusy(button, meta.busyText);
              var restoreAction = pendingConfigActionButton ? setButtonBusy(pendingConfigActionButton, meta.busyText) : function() {};
              sendAuthorizedPost(meta.url, meta.headers, meta.body).then(function(res) {
                  restoreConfirm();
                  restoreAction();
                  if (checkAuthError(res.status)) return;
                  if (res.ok) {
                      closeConfigActionConfirm();
                      showResult(true, '🧭 ' + meta.doneText);
                      setTimeout(function() { location.reload(); }, REDIRECT_DELAY_MS);
                  } else {
                      res.text().then(function(errorMessage) {
                          showResult(false, errorMessage ? ('❌ ' + errorMessage) : '❌ Failed');
                      });
                  }
              }).catch(function() {
                  restoreConfirm();
                  restoreAction();
                  showResult(false, NETWORK_ERROR_MSG);
              });
          }
          document.getElementById('config-action-confirm').addEventListener('click', function(event) {
              if (event.target === this) closeConfigActionConfirm();
          });
          document.addEventListener('keydown', function(event) {
              if (event.key === 'Escape') closeConfigActionConfirm();
          });
`;
