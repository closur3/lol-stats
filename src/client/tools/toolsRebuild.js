export const toolsRebuild = `
          function requestArchiveRebuild(slug) {
              return sendAuthorizedPost('/rebuild-archive', { 'Content-Type': 'application/json' }, JSON.stringify({ slug: slug }));
          }

          function rebuildArchive(slug, name, button) {
              var restore = disableButton(button);
              requestArchiveRebuild(slug).then(function(res) {
                  if (checkAuthError(res.status)) return;
                  if (res.ok) {
                      showResult(true, 'Archive rebuild completed: ' + name);
                      return;
                  }
                  return readActionMessage(res, 'Request failed.').then(function(message) {
                      showResult(false, 'Archive rebuild failed: ' + name + ' — ' + message);
                  });
              }).catch(function() {
                  showResult(false, networkErrorMessage);
              }).then(restore);
          }

          function rebuildSelected(button) {
              var checked = document.querySelectorAll('.qr-chk-archived:checked');
              if (checked.length === 0) { showWarning('Select at least one archived tournament.'); return; }
              var selected = Array.from(checked).map(function(checkboxElement) { return { slug: (checkboxElement.value || '').trim(), name: (checkboxElement.dataset.name || '').trim() }; });
              var hasMissingField = selected.some(function(item) {
                  return !item.slug;
              });
              if (hasMissingField) { showWarning('Required tournament data is missing.'); return; }
              var restore = disableButton(button);
              var success = 0, fail = 0;
              var promises = selected.map(function(selectedArchive) {
                  return requestArchiveRebuild(selectedArchive.slug).then(function(res) {
                      if (checkAuthError(res.status)) return;
                      if (res.ok) {
                          success++;
                          return;
                      }
                      fail++;
                      return res.text().then(function(errorMessage) {
                          if (errorMessage) showToast('Archive rebuild failed: ' + selectedArchive.name + ' — ' + errorMessage, 'error');
                      });
                  }).catch(function() { fail++; });
              });
              Promise.all(promises).then(function() {
                  restore();
                  var total = success + fail;
                  var message = fail === 0
                      ? ('Archive rebuild completed: ' + success + '/' + total)
                      : ('Archive rebuild partially completed: ' + success + '/' + total);
                  if (fail === 0) showResult(true, message); else showWarning(message);
              });
          }
`;
