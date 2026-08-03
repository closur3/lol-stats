export default `.build-footer { margin-top: auto; text-align: center; padding: 15px 20px; padding-bottom: calc(15px + env(safe-area-inset-bottom)); color: #94a3b8; font-size: 11px; }

    .build-footer .footer-label { font-weight: 500; }
    .build-footer .footer-time, .build-footer .footer-sha { color: #64748b; font-weight: 600; }
    .build-footer a { color: inherit; text-decoration: none; opacity: 1; transition: filter 0.2s ease; }
    .build-footer a:hover { filter: brightness(1.08); text-decoration: underline; }
    .footer-cron-info { display: inline-block; position: relative; width: 6px; height: 6px; margin-right: 3px; vertical-align: middle; top: -1px; }
    .footer-cron-info.unavailable { display: none; }
    .footer-cron-info::before { content: ""; display: none; position: absolute; left: 50%; bottom: 100%; width: 28px; height: 8px; transform: translateX(-50%); }
    .footer-cron-info:hover::before, .footer-cron-info.is-open::before { display: block; }
    .footer-cron-trigger { width: 6px; height: 6px; display: block; padding: 0; border: 0; background: transparent; border-radius: var(--radius-circle); cursor: pointer; }
    .footer-cron-trigger:focus-visible { outline: 2px solid rgba(37,99,235,0.35); outline-offset: 1px; }
    .cron-dot { display: block; width: 6px; height: 6px; border-radius: var(--radius-circle); }
    .footer-cron-info.idle .cron-dot, .footer-cron-info.idle .footer-cron-panel-dot { background-color: #94a3b8; }
    .footer-cron-info.active .cron-dot, .footer-cron-info.active .footer-cron-panel-dot { background-color: #22c55e; }
    .footer-cron-info.active .footer-cron-trigger:hover .cron-dot { box-shadow: 0 0 0 3px rgba(34,197,94,0.16); }
    .footer-cron-info.idle .footer-cron-trigger:hover .cron-dot { box-shadow: 0 0 0 3px rgba(148,163,184,0.18); }
    .footer-cron-panel { display: none; position: absolute; z-index: 160; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); width: max-content; max-width: calc(100vw - 30px); padding: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); color: var(--color-text-muted); box-shadow: 0 14px 32px rgba(15,23,42,0.15); text-align: left; cursor: default; }
    .footer-cron-info:hover .footer-cron-panel, .footer-cron-info.is-open .footer-cron-panel { display: flex; flex-direction: column; gap: 9px; }
    .footer-cron-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 2px; }
    .footer-cron-label { color: var(--color-text-faint); font-size: 9px; font-weight: 700; letter-spacing: 0.8px; }
    .footer-cron-state { display: inline-flex; align-items: center; gap: 5px; min-height: 20px; padding: 0 7px; border-radius: var(--radius-badge); font-size: 9px; font-weight: 700; letter-spacing: 0.4px; }
    .footer-cron-info.active .footer-cron-state { background: #f0fdf4; color: #15803d; }
    .footer-cron-info.idle .footer-cron-state { background: #f1f5f9; color: #64748b; }
    .footer-cron-panel-dot { width: 6px; height: 6px; border-radius: var(--radius-circle); flex: 0 0 6px; }
    .footer-cron-schedules { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-control); background: var(--color-surface-muted); }
    .footer-cron-schedule { display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; }
    .footer-cron-schedule + .footer-cron-schedule { border-top: 1px solid var(--color-border); }
    .footer-cron-schedule code { color: var(--color-text); font-size: 11px; font-weight: 600; line-height: 1.35; white-space: nowrap; }
    .footer-cron-cst { display: grid; grid-template-columns: 5ch max-content max-content; column-gap: 1ch; color: var(--color-text-muted); font-size: 10px; font-weight: 500; line-height: 1.35; white-space: nowrap; }
`;
