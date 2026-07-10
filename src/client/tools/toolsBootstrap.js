export const TOOLS_BOOTSTRAP = `
          var toastContainer = document.getElementById("toast-container");
          var TOAST_DURATION_MS = 3000;
          var REDIRECT_DELAY_MS = 1500;
          var AUTH_ERROR_MSG = "Session expired. Sign in again.";
          var NETWORK_ERROR_MSG = "Network request failed. Try again.";

          document.getElementById('chk-active-all').addEventListener('change', function() {
              document.querySelectorAll('#active-list .item-chk').forEach(function(checkboxElement) { checkboxElement.checked = this.checked; }.bind(this));
          });
          document.getElementById('chk-archived-all').addEventListener('change', function() {
              document.querySelectorAll('.qr-chk-archived').forEach(function(checkboxElement) { checkboxElement.checked = this.checked; }.bind(this));
          });

          function clearAuth() { window.location.href = "/tools"; }
          function showToast(message, type) {
              type = type || 'success';
              var toast = document.createElement('div');
              toast.className = 'toast ' + type; toast.innerText = message;
              toastContainer.appendChild(toast); void toast.offsetWidth; toast.classList.add('show');
              setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, TOAST_DURATION_MS);
          }
          function checkAuthError(status) { if (status === 401) { showToast(AUTH_ERROR_MSG, "error"); clearAuth(); return true; } return false; }
          function disableButton(button) {
              button.disabled = true;
              return function() { button.disabled = false; };
          }
          function sendAuthorizedPost(url, extraHeaders, body) {
              return fetch(url, { method: 'POST', headers: extraHeaders || {}, body: body, credentials: 'same-origin' });
          }
          function showResult(ok, text) { showToast(text, ok ? 'success' : 'error'); }
          function showWarning(text) { showToast(text, 'warning'); }
          var pendingConfigAction = null;
          var pendingConfigActionButton = null;
          var pendingConfigActionPayload = null;
          function getConfigActionMeta(action, payload) {
              payload = payload || {};
              var actions = {
                  'active-runtime-delete': {
                      label: 'Delete active runtime state',
                      flow: 'Target: ' + (payload.name || payload.slug || 'Active tournament'),
                      icon: '!',
                      url: '/delete-active',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ slug: payload.slug }),
                      submitText: 'Delete',
                      successMessage: 'Active runtime state deleted: ' + (payload.name || payload.slug),
                      failurePrefix: 'Delete failed: ' + (payload.name || payload.slug)
                  },
                  'archive-delete': {
                      label: 'Delete archive snapshot',
                      flow: 'Target: ' + (payload.name || payload.slug || 'Archive tournament'),
                      icon: '!',
                      url: '/delete-archive',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ slug: payload.slug }),
                      submitText: 'Delete',
                      successMessage: 'Archive snapshot deleted: ' + (payload.name || payload.slug),
                      failurePrefix: 'Delete failed: ' + (payload.name || payload.slug)
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
              var meta = getConfigActionMeta(action, payload);
              if (!meta) { showResult(false, 'Unknown configuration action.'); return; }
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
              var restoreConfirm = disableButton(button);
              var restoreAction = pendingConfigActionButton ? disableButton(pendingConfigActionButton) : function() {};
              sendAuthorizedPost(meta.url, meta.headers, meta.body).then(function(res) {
                  restoreConfirm();
                  restoreAction();
                  if (checkAuthError(res.status)) return;
                  if (res.ok) {
                      closeConfigActionConfirm();
                      if (res.status === 207) {
                          res.text().then(function(message) { showWarning(message || 'Operation completed with schedule warnings.'); });
                      } else {
                          showResult(true, meta.successMessage);
                      }
                      setTimeout(function() { location.reload(); }, REDIRECT_DELAY_MS);
                  } else {
                      res.text().then(function(errorMessage) {
                          showResult(false, meta.failurePrefix + ' — ' + (errorMessage || 'Request failed.'));
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
