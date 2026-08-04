export const toolsActions = `
          function readActionMessage(res, defaultMessage) {
              return res.text().then(function(text) { return text || defaultMessage; });
          }

          function readActionResult(res) {
              return res.json().then(function(result) {
                  if (!result || typeof result.message !== 'string' || !result.cronInfo || typeof result.cronInfo !== 'object') {
                      throw new Error('Invalid action result.');
                  }
                  return result;
              });
          }

          function requestForceUpdate(names) {
              return sendAuthorizedPost('/force', { 'Content-Type': 'application/json' }, JSON.stringify({ names: names }));
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
              if (checked.length === 0) {
                  var available = Array.from(document.querySelectorAll('#active-list .item-chk'));
                  if (available.length === 0) { showWarning('No active tournaments are available.'); return; }
                  previewConfigAction('active-force-all', button, {
                      names: available.map(function(checkboxElement) { return checkboxElement.value; })
                  });
                  return;
              }
              var names = Array.from(checked).map(function(checkboxElement) { return checkboxElement.value; });
              var restore = disableButton(button);
              requestForceUpdate(names).then(function(res) {
                  showForceUpdateResult(res, names.length + '/' + names.length);
              }).catch(function() { showResult(false, networkErrorMessage); }).then(restore);
          }

          function forceOne(name, btnEl) {
              var restore = disableButton(btnEl);
              requestForceUpdate([name]).then(function(res) {
                  showForceUpdateResult(res, name);
              }).catch(function() { showResult(false, networkErrorMessage); }).then(restore);
          }
`;
