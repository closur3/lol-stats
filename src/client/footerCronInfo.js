export const footerCronInfoScript = `
function closeFooterCronInfo() {
  const info = document.querySelector('.footer-cron-info.is-open');
  if (!info) return;
  const trigger = info.querySelector('.footer-cron-trigger');
  const panel = info.querySelector('.footer-cron-panel');
  if (!trigger || !panel) throw new Error('Footer Cron information structure invalid');
  info.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
  panel.setAttribute('aria-hidden', 'true');
}

function toggleFooterCronInfo(trigger) {
  if (!(trigger instanceof HTMLButtonElement)) throw new Error('Footer Cron trigger invalid');
  const info = trigger.closest('.footer-cron-info');
  if (!info) throw new Error('Footer Cron information missing');
  const panel = info.querySelector('.footer-cron-panel');
  if (!panel) throw new Error('Footer Cron information panel missing');
  const shouldOpen = !info.classList.contains('is-open');
  closeFooterCronInfo();
  if (!shouldOpen) return;
  info.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');
  panel.setAttribute('aria-hidden', 'false');
}

function assertFooterCronInfo(cronInfo) {
  if (!cronInfo || typeof cronInfo !== 'object' || Array.isArray(cronInfo)) throw new Error('Cron information is invalid.');
  if (!['active', 'idle', 'unavailable'].includes(cronInfo.status) || !Array.isArray(cronInfo.schedules)) {
    throw new Error('Cron information is invalid.');
  }
  cronInfo.schedules.forEach(function(schedule) {
    if (!schedule || typeof schedule !== 'object' || typeof schedule.expression !== 'string' || !schedule.cst || typeof schedule.cst !== 'object' || typeof schedule.cst.period !== 'string' || typeof schedule.cst.timeRange !== 'string' || typeof schedule.cst.frequency !== 'string') {
      throw new Error('Cron schedule is invalid.');
    }
  });
  return cronInfo;
}

function renderFooterCronSchedules(container, schedules) {
  container.replaceChildren();
  schedules.forEach(function(schedule) {
    var item = document.createElement('span');
    var expression = document.createElement('code');
    var cst = document.createElement('span');
    var period = document.createElement('span');
    var timeRange = document.createElement('span');
    var frequency = document.createElement('span');
    item.className = 'footer-cron-schedule';
    expression.textContent = schedule.expression;
    cst.className = 'footer-cron-cst';
    period.className = 'footer-cron-period';
    period.textContent = schedule.cst.period;
    timeRange.textContent = schedule.cst.timeRange;
    frequency.textContent = '(' + schedule.cst.frequency + ', CST)';
    cst.appendChild(period);
    cst.appendChild(timeRange);
    cst.appendChild(frequency);
    item.appendChild(expression);
    item.appendChild(cst);
    container.appendChild(item);
  });
}

function updateFooterCronInfo(cronInfo) {
  var normalized = assertFooterCronInfo(cronInfo);
  const info = document.querySelector('.footer-cron-info');
  if (!info) throw new Error('Footer Cron information missing');
  const status = info.querySelector('.footer-cron-status');
  const schedules = info.querySelector('.footer-cron-schedules');
  if (!status || !schedules) throw new Error('Footer Cron information content missing');
  closeFooterCronInfo();
  info.classList.remove('active', 'idle', 'unavailable');
  info.classList.add(normalized.status);
  status.textContent = normalized.status.toUpperCase();
  renderFooterCronSchedules(schedules, normalized.schedules);
}

document.addEventListener('click', closeFooterCronInfo);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeFooterCronInfo();
});
window.toggleFooterCronInfo = toggleFooterCronInfo;
window.updateFooterCronInfo = updateFooterCronInfo;
`;
