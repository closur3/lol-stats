export const toolsBootstrap = `
          var toastContainer = document.getElementById("toast-container");
          var toastDurationMs = 5000;
          var authErrorMessage = "Session expired. Sign in again.";
          var networkErrorMessage = "Network request failed. Try again.";

          document.getElementById('chk-active-all').addEventListener('change', function() {
              document.querySelectorAll('#active-list .item-chk').forEach(function(checkboxElement) { checkboxElement.checked = this.checked; }.bind(this));
          });
          document.getElementById('chk-archived-all').addEventListener('change', function() {
              document.querySelectorAll('.qr-chk-archived').forEach(function(checkboxElement) { checkboxElement.checked = this.checked; }.bind(this));
          });

          function clearAuth() { window.location.href = "/tools"; }
          function dismissToast(toast) {
              if (!toast || toast.classList.contains('leaving')) return;
              clearTimeout(toast.dismissTimer);
              toast.classList.add('leaving');
              toast.classList.remove('show');
              setTimeout(function() { toast.remove(); }, 240);
          }
          function showToast(message, type) {
              type = type || 'success';
              var icons = { success: '✓', warning: '!', error: '×' };
              var toast = document.createElement('div');
              var icon = document.createElement('span');
              var text = document.createElement('span');
              var close = document.createElement('button');
              var progress = document.createElement('span');
              toast.className = 'toast ' + type;
              toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
              toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
              toast.style.setProperty('--toast-duration', toastDurationMs + 'ms');
              icon.className = 'toast-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = icons[type] || 'i';
              text.className = 'toast-message'; text.textContent = message;
              close.className = 'toast-close'; close.type = 'button'; close.setAttribute('aria-label', 'Dismiss notification'); close.textContent = '×';
              progress.className = 'toast-progress'; progress.setAttribute('aria-hidden', 'true');
              close.addEventListener('click', function() { dismissToast(toast); });
              toast.appendChild(icon); toast.appendChild(text); toast.appendChild(close); toast.appendChild(progress);
              toastContainer.appendChild(toast); void toast.offsetWidth; toast.classList.add('show');
              toast.dismissTimer = setTimeout(function() { dismissToast(toast); }, toastDurationMs);
          }
          function updateCronStatus(hasActiveCron) {
              if (typeof hasActiveCron !== 'boolean') throw new Error('Cron status must be boolean.');
              var dot = document.querySelector('.build-footer .cron-dot');
              if (!dot) throw new Error('Cron status dot missing.');
              dot.classList.toggle('active', hasActiveCron);
              dot.classList.toggle('idle', !hasActiveCron);
          }
          function checkAuthError(status) { if (status === 401) { showToast(authErrorMessage, "error"); clearAuth(); return true; } return false; }
          function disableButton(button) {
              button.disabled = true;
              return function() { button.disabled = false; };
          }
          function sendAuthorizedPost(url, extraHeaders, body) {
              if (!extraHeaders || typeof extraHeaders !== 'object') throw new Error('Request headers missing.');
              return fetch(url, { method: 'POST', headers: extraHeaders, body: body, credentials: 'same-origin' });
          }
          function showResult(ok, text) { showToast(text, ok ? 'success' : 'error'); }
          function showWarning(text) { showToast(text, 'warning'); }
          var pendingConfigAction = null;
          var pendingConfigActionButton = null;
          var pendingConfigActionPayload = null;
          function getConfigActionMeta(action, payload) {
              if (!payload || typeof payload !== 'object') throw new Error('Configuration action payload missing.');
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
              pendingConfigActionPayload = payload;
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
              var action = pendingConfigAction;
              var meta = getConfigActionMeta(action, pendingConfigActionPayload);
              if (!meta) return;
              var restoreConfirm = disableButton(button);
              var restoreAction = pendingConfigActionButton ? disableButton(pendingConfigActionButton) : function() {};
              sendAuthorizedPost(meta.url, meta.headers, meta.body).then(function(res) {
                  restoreConfirm();
                  restoreAction();
                  if (checkAuthError(res.status)) return;
                  if (res.ok) {
                      closeConfigActionConfirm();
                      if (action === 'active-runtime-delete') {
                          return readActionResult(res).then(function(result) {
                              updateCronStatus(result.hasActiveCron);
                              if (res.status === 207) showWarning(result.message);
                              else showResult(true, meta.successMessage);
                          });
                      }
                      if (res.status === 207) {
                          return readActionMessage(res, 'Operation completed with warnings.').then(showWarning);
                      } else {
                          showResult(true, meta.successMessage);
                      }
                  } else {
                      res.text().then(function(errorMessage) {
                          showResult(false, meta.failurePrefix + ' — ' + (errorMessage || 'Request failed.'));
                      });
                  }
              }).catch(function() {
                  restoreConfirm();
                  restoreAction();
                  showResult(false, networkErrorMessage);
              });
          }
          document.getElementById('config-action-confirm').addEventListener('click', function(event) {
              if (event.target === this) closeConfigActionConfirm();
          });
          document.addEventListener('keydown', function(event) {
              if (event.key === 'Escape') closeConfigActionConfirm();
          });
`;
