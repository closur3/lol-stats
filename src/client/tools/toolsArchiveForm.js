export const TOOLS_ARCHIVE_FORM = `
          function fillArchive(slug) {
              var checkboxElement = document.querySelector('.qr-chk-archived[value="' + CSS.escape(slug) + '"]');
              if (!checkboxElement) { showToast("❌ Archive item not found", "error"); return; }

              var overviewValue = "";
              var rawOverview = (checkboxElement.dataset.overview || "").trim();
              if (rawOverview) {
                  try {
                      var parsedOverview = JSON.parse(rawOverview);
                      if (Array.isArray(parsedOverview)) overviewValue = parsedOverview.join(", ");
                      else overviewValue = String(parsedOverview || "");
                  } catch (error) {
                      showToast("❌ Invalid overview data format", "error");
                      return;
                  }
              }

              document.getElementById('ma-slug').value = (checkboxElement.value || '').trim();
              document.getElementById('ma-name').value = (checkboxElement.dataset.name || '').trim();
              document.getElementById('ma-overview').value = overviewValue;
              document.getElementById('ma-league').value = (checkboxElement.dataset.league || '').trim();
              document.getElementById('ma-start').value = (checkboxElement.dataset.start || '').trim();
              document.getElementById('ma-end').value = (checkboxElement.dataset.end || '').trim();
              showToast("📋 Filled Manual Archive form", "success");
          }

          function deleteArchive(slug, name) {
              if (!requireAuth()) return;
              if (!confirm('Delete ' + name + '?')) return;
              sendAuthorizedPost('/delete-archive', { 'Content-Type': 'application/json' }, JSON.stringify({ slug: slug, name: name })).then(function(res) {
                  if (checkAuthError(res.status)) return;
                  if (res.ok) { showResult(true, '🗑️ Deleted'); location.reload(); }
                  else { res.text().then(function(errorMessage) { showResult(false, errorMessage ? ('❌ ' + errorMessage) : '❌ Failed'); }); }
              }).catch(function() { showResult(false, NETWORK_ERROR_MSG); });
          }

          function submitManualArchive() {
              if (!requireAuth()) return;
              var payload = {
                  slug: document.getElementById('ma-slug').value.trim(),
                  name: document.getElementById('ma-name').value.trim(),
                  overview_page: document.getElementById('ma-overview').value.trim(),
                  league: document.getElementById('ma-league').value.trim(),
                  start_date: document.getElementById('ma-start').value.trim(),
                  end_date: document.getElementById('ma-end').value.trim()
              };
              if (!payload.slug || !payload.name || !payload.overview_page || !payload.league || !payload.start_date || !payload.end_date) { showToast("⚠️ Missing required fields", "error"); return; }
              sendAuthorizedPost('/manual-archive', { 'Content-Type': 'application/json' }, JSON.stringify(payload)).then(function(res) {
                  if (checkAuthError(res.status)) return;
                  if (res.ok) { showResult(true, '📦 Saved'); setTimeout(function() { location.reload(); }, REDIRECT_DELAY_MS); }
                  else { res.text().then(function(errorMessage) { showResult(false, errorMessage ? ('❌ ' + errorMessage) : '❌ Failed'); }); }
              }).catch(function() { showResult(false, NETWORK_ERROR_MSG); });
          }
`;
