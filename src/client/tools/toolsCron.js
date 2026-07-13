export const toolsCron = `
          function runWorkerCron(button) {
              var restoreButton = disableButton(button);
              sendAuthorizedPost('/run-cron', {}, null).then(function(response) {
                  if (checkAuthError(response.status)) return;
                  if (response.ok) {
                      showResult(true, 'Cron completed.');
                      setTimeout(function() { location.reload(); }, redirectDelayMs);
                      return;
                  }
                  return readActionMessage(response, 'Request failed.').then(function(message) {
                      showResult(false, 'Cron failed: ' + message);
                  });
              }).catch(function() {
                  showResult(false, networkErrorMessage);
              }).then(restoreButton);
          }
`;
