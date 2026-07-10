export const toolsActions = `
          function readActionMessage(res, defaultMessage) {
              return res.text().then(function(text) { return text || defaultMessage; });
          }

          function requestForceUpdate(slugs) {
              return sendAuthorizedPost('/force', { 'Content-Type': 'application/json' }, JSON.stringify({ slugs: slugs }));
          }

          function showForceUpdateResult(res, target) {
              if (checkAuthError(res.status)) return;
              if (res.status === 207) {
                  return readActionMessage(res, 'Schedule warnings were reported.').then(function(message) {
                      showWarning('Force update completed with schedule warnings: ' + message);
                  });
              }
              if (res.ok) {
                  showResult(true, 'Force update completed: ' + target);
                  return;
              }
              return readActionMessage(res, 'Request failed.').then(function(message) {
                  showResult(false, 'Force update failed: ' + target + ' — ' + message);
              });
          }

          function forceSelected(button) {
              var checked = document.querySelectorAll('#active-list .item-chk:checked');
              if (checked.length === 0) { showWarning('Select at least one active tournament.'); return; }
              var slugs = Array.from(checked).map(function(checkboxElement) { return checkboxElement.value; });
              var restore = disableButton(button);
              requestForceUpdate(slugs).then(function(res) {
                  showForceUpdateResult(res, slugs.length + '/' + slugs.length);
              }).catch(function() { showResult(false, networkErrorMessage); }).then(restore);
          }

          function forceOne(slug, name, btnEl) {
              var restore = disableButton(btnEl);
              requestForceUpdate([slug]).then(function(res) {
                  showForceUpdateResult(res, name);
              }).catch(function() { showResult(false, networkErrorMessage); }).then(restore);
          }

          function deleteActive(slug, name, button) {
              previewConfigAction('active-runtime-delete', button, { slug: slug, name: name });
          }
`;
