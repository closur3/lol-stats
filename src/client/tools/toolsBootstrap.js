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
`;
