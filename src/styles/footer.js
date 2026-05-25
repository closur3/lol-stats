export default `.build-footer { margin-top: auto; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 2px; padding: 15px 20px; padding-bottom: calc(15px + env(safe-area-inset-bottom)); color: #94a3b8; font-size: 11px; }

    .build-footer .footer-label { font-weight: 500; }
    .build-footer .footer-time, .build-footer .footer-sha { color: #64748b; font-weight: 600; }
    .build-footer a { color: inherit; text-decoration: none; opacity: 1; transition: filter 0.2s ease; }
    .build-footer a:hover { filter: brightness(1.08); text-decoration: underline; }
    .cron-dot { width: 6px; height: 6px; border-radius: 50%; }
    .cron-dot.idle { background-color: #94a3b8; }
    .cron-dot.active { background-color: #22c55e; }
`;
