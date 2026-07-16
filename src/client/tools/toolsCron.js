export const toolsCron = `
          function runWorkerCron(button) {
              var restoreButton = disableButton(button);
              sendAuthorizedPost('/run-cron', {}, null).then(function(response) {
                  if (checkAuthError(response.status)) return;
                  if (response.ok) {
                      return readActionResult(response).then(function(result) {
                          updateCronStatus(result.hasActiveCron);
                          showResult(true, result.message);
                      });
                  }
                  return readActionMessage(response, 'Request failed.').then(function(message) {
                      showResult(false, 'Cron failed: ' + message);
                  });
              }).catch(function() {
                  showResult(false, networkErrorMessage);
              }).then(restoreButton);
          }
`;
