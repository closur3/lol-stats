export const statisticsScopesScript = `
function closeTournamentSourceMenus() {
  document.querySelectorAll('.tournament-source-menu.is-open').forEach(menu => {
    menu.classList.remove('is-open');
    const trigger = menu.querySelector('.tournament-source-trigger');
    const options = menu.querySelector('.tournament-source-options');
    if (!trigger || !options) throw new Error('Tournament source menu invalid');
    trigger.setAttribute('aria-expanded', 'false');
    options.setAttribute('aria-hidden', 'true');
  });
}

function toggleTournamentSourceMenu(trigger) {
  if (!(trigger instanceof HTMLButtonElement)) throw new Error('Tournament source trigger invalid');
  const menu = trigger.closest('.tournament-source-menu');
  if (!menu) throw new Error('Tournament source menu missing');
  const options = menu.querySelector('.tournament-source-options');
  if (!options) throw new Error('Tournament source options missing');
  const shouldOpen = !menu.classList.contains('is-open');
  closeTournamentSourceMenus();
  closeCompactMenus();
  if (!shouldOpen) return;

  menu.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');
  options.setAttribute('aria-hidden', 'false');
  options.classList.remove('is-align-start', 'is-align-end');
  const bounds = options.getBoundingClientRect();
  if (bounds.left < 8) options.classList.add('is-align-start');
  if (bounds.right > window.innerWidth - 8) options.classList.add('is-align-end');
}

function setStatisticsScope(scopeOption) {
  if (!(scopeOption instanceof HTMLButtonElement)) throw new Error('Statistics scope option invalid');
  const root = scopeOption.closest('.statistics-root');
  if (!root) throw new Error('Statistics root missing');

  const scope = scopeOption.dataset.statisticsScopeValue;
  if (!scope) throw new Error('Statistics scope value missing');
  const scopeLabel = scopeOption.dataset.statisticsScopeLabel;
  if (!scopeLabel) throw new Error('Statistics scope label missing');
  closeTournamentSourceMenus();
  const targets = ['content', 'summary', 'legend', 'jump'];
  for (const target of targets) {
    const elements = [...root.querySelectorAll('[data-statistics-scope-' + target + ']')];
    const active = elements.filter(element => element.dataset['statisticsScope' + target[0].toUpperCase() + target.slice(1)] === scope);
    if (active.length !== 1) throw new Error('Statistics scope ' + target + ' mismatch: ' + scope);
    for (const element of elements) {
      const isActive = element === active[0];
      element.classList.toggle('is-hidden', !isActive);
      element.setAttribute('aria-hidden', String(!isActive));
    }
  }

  const scopeMenu = scopeOption.closest('.statistics-scope-select');
  if (!scopeMenu) throw new Error('Statistics scope menu missing');
  const triggerLabel = scopeMenu.querySelector('.compact-menu-value');
  if (!triggerLabel) throw new Error('Statistics scope trigger label missing');
  triggerLabel.textContent = scopeLabel;
  scopeMenu.querySelectorAll('.compact-menu-option').forEach(option => {
    const isSelected = option === scopeOption;
    option.classList.toggle('is-selected', isSelected);
    option.setAttribute('aria-selected', String(isSelected));
  });
  closeCompactMenus();
  root.dataset.statisticsScope = scope;
  if (typeof syncFloatingActionsMobilePosition === 'function') syncFloatingActionsMobilePosition();
}
document.addEventListener('click', closeTournamentSourceMenus);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeTournamentSourceMenus();
});
window.closeTournamentSourceMenus = closeTournamentSourceMenus;
window.toggleTournamentSourceMenu = toggleTournamentSourceMenu;
window.setStatisticsScope = setStatisticsScope;
`;
