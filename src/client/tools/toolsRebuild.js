export const toolsRebuild = `
          function requestArchiveRebuild(name) {
              return sendAuthorizedPost('/rebuild-archive', { 'Content-Type': 'application/json' }, JSON.stringify({ name: name }));
          }

          function rebuildArchive(name, button) {
              var restore = disableButton(button);
              requestArchiveRebuild(name).then(function(res) {
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

          function readArchiveSelections(checkboxes) {
              var selected = Array.from(checkboxes).map(function(checkboxElement) {
                  return (checkboxElement.value || '').trim();
              });
              if (selected.some(function(name) { return !name; })) {
                  throw new Error('Required tournament data is missing.');
              }
              return selected;
          }

          function requestArchiveRebuildBatch(selected) {
              var success = 0;
              var fail = 0;
              var promises = selected.map(function(name) {
                  return requestArchiveRebuild(name).then(function(res) {
                      if (checkAuthError(res.status)) return;
                      if (res.ok) {
                          success++;
                          return;
                      }
                      fail++;
                      return res.text().then(function(errorMessage) {
                          if (errorMessage) showToast('Archive rebuild failed: ' + name + ' — ' + errorMessage, 'error');
                      });
                  }).catch(function() { fail++; });
              });
              return Promise.all(promises).then(function() {
                  return { success: success, fail: fail };
              });
          }

          function showArchiveRebuildBatchResult(result) {
              var total = result.success + result.fail;
              var message = result.fail === 0
                  ? ('Archive rebuild completed: ' + result.success + '/' + total)
                  : ('Archive rebuild partially completed: ' + result.success + '/' + total);
              if (result.fail === 0) showResult(true, message); else showWarning(message);
          }

          function runArchiveRebuildBatch(selected, button) {
              var restore = disableButton(button);
              requestArchiveRebuildBatch(selected).then(function(result) {
                  restore();
                  showArchiveRebuildBatchResult(result);
              });
          }

          function rebuildSelected(button) {
              var checked = document.querySelectorAll('.qr-chk-archived:checked');
              if (checked.length === 0) {
                  var available = document.querySelectorAll('.qr-chk-archived');
                  if (available.length === 0) { showWarning('No archived tournaments are available.'); return; }
                  try {
                      previewConfigAction('archive-rebuild-all', button, { tournaments: readArchiveSelections(available) });
                  } catch (error) {
                      showWarning(error.message);
                  }
                  return;
              }
              try {
                  runArchiveRebuildBatch(readArchiveSelections(checked), button);
              } catch (error) {
                  showWarning(error.message);
              }
          }
`;
