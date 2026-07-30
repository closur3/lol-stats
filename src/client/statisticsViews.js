export const statisticsViewsScript = `
function setStatisticsView(rootId, nextMode) {
    const root = document.getElementById(rootId);
    if (!root || !root.classList.contains('statistics-root')) {
        throw new Error('Statistics root missing: ' + rootId);
    }
    if (nextMode !== 'combined' && nextMode !== 'separated') {
        throw new Error('Invalid statistics view: ' + nextMode);
    }
    root.dataset.statisticsView = nextMode;
    root.querySelectorAll('[data-statistics-mode]').forEach(view => {
        const isActive = view.dataset.statisticsMode === nextMode;
        view.classList.toggle('is-hidden', !isActive);
        view.setAttribute('aria-hidden', String(!isActive));
    });
    const controls = root.querySelectorAll('[data-statistics-target]');
    if (controls.length !== 2) throw new Error('Statistics controls invalid: ' + rootId);
    controls.forEach(control => {
        const isActive = control.dataset.statisticsTarget === nextMode;
        control.classList.toggle('is-active', isActive);
        control.setAttribute('aria-pressed', String(isActive));
    });
    if (typeof syncFloatingActionsMobilePosition === 'function') {
        syncFloatingActionsMobilePosition();
    }
}

window.setStatisticsView = setStatisticsView;
`;
