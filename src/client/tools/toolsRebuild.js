export const TOOLS_REBUILD = `
          function rebuildSelected() {
              var checked = document.querySelectorAll('.qr-chk-archived:checked');
              if (checked.length === 0) { showToast("⚠️ No archive selected", "error"); return; }
              var selected = Array.from(checked).map(function(checkboxElement) { return { slug: (checkboxElement.value || '').trim(), name: (checkboxElement.dataset.name || '').trim() }; });
              var hasMissingField = selected.some(function(item) {
                  return !item.slug;
              });
              if (hasMissingField) { showToast("⚠️ Missing required fields", "error"); return; }
              var button = event.target;
              var restore = setButtonBusy(button, 'Rebuilding...');
              var success = 0, fail = 0;
              var promises = selected.map(function(selectedArchive) {
                  return sendAuthorizedPost('/rebuild-archive', { 'Content-Type': 'application/json' }, JSON.stringify({ slug: selectedArchive.slug })).then(function(res) { if (res.ok) success++; else { fail++; res.text().then(function(errorMessage) { if (errorMessage) showToast('❌ ' + selectedArchive.name + ': ' + errorMessage, "error"); }); if (checkAuthError(res.status)) return; } }).catch(function() { fail++; });
              });
              Promise.all(promises).then(function() {
                  restore();
                  var total = success + fail;
                  var message = fail === 0
                      ? ('✅ Rebuild completed: ' + success + '/' + total)
                      : ('⚠️ Rebuild partial: ' + success + '/' + total);
                  showResult(fail === 0, message);
              });
          }
`;
