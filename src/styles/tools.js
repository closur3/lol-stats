import baseCSS from "./base.js";

export default `${baseCSS}
    .container { flex: 1; max-width: 1000px; display: flex; flex-direction: column; gap: 20px; }

    .table-title { padding: 13px 20px; min-height: 58px; font-weight: 600; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: #fff; color: #0f172a; font-size: 15px; box-sizing: border-box; }
    .tools-cron-btn { width: auto; padding: 7px 12px; font-size: 12px; }
    .section-body { padding: 20px; box-sizing: border-box; }
    .config-error-alert { box-sizing: border-box; width: 100%; margin: 0 0 14px; padding: 12px 14px; border: 1px solid #fdba74; border-left: 4px solid #f97316; border-radius: var(--radius-card); color: #9a3412; background: #fff7ed; font-size: 13px; line-height: 1.55; }
    .config-error-alert strong { display: block; color: #c2410c; font-size: 13px; margin-bottom: 4px; }
    .config-error-alert span { color: #9a3412; overflow-wrap: anywhere; }

    .ops-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
    .ops-panel { min-width: 0; overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); }
    .ops-body .list { display: flex; flex-direction: column; gap: 2px; padding: 6px; }
    .ops-body .item { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: var(--radius-control); transition: 0.2s; border: 1px solid transparent; }
    .ops-body .item:hover { background: #f8fafc; border-color: #e2e8f0; }
    .ops-body .item-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; cursor: pointer; }
    .ops-body .item-chk { width: 16px; height: 16px; accent-color: #2563eb; flex-shrink: 0; }
    .ops-body .item-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ops-body .item-right { display: flex; gap: 4px; flex-shrink: 0; align-items: center; }
    .ops-body .group-header { display: flex; align-items: center; gap: 8px; min-height: 42px; padding: 8px 18px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-muted); }
    .ops-body .group-chk { width: 16px; height: 16px; accent-color: #2563eb; flex-shrink: 0; cursor: pointer; }
    .ops-body .group-label { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; flex: 1; }
    .ops-body .group-action { width: auto; min-width: 86px; padding: 7px 11px; font-size: 11px; }

    .index-confirm-overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(15,23,42,0.38); z-index: 1001; padding: 20px; }
    .index-confirm-overlay.open { display: flex; }
    .index-confirm-dialog { width: min(420px, 100%); background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius-card); box-shadow: 0 24px 60px rgba(15,23,42,0.22); padding: 20px; display: grid; grid-template-columns: auto 1fr; gap: 14px; }
    .index-confirm-icon { width: 38px; height: 38px; border-radius: var(--radius-circle); background: #eff6ff; color: #1d4ed8; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; line-height: 1; }
    .index-confirm-content { min-width: 0; }
    .index-confirm-content h2 { margin: 0 0 8px; font-size: 16px; line-height: 1.35; color: #0f172a; letter-spacing: 0; }
    .index-confirm-flow { font-size: 12px; line-height: 1.45; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-control); padding: 8px 10px; overflow-wrap: anywhere; }
    .index-confirm-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
    .index-confirm-actions .primary-btn, .index-confirm-actions .secondary-btn { min-width: 96px; }

    .icon-btn:disabled, .primary-btn:disabled, .secondary-btn:disabled { opacity: 0.7; cursor: wait; }

    @media (max-width: 760px) { .ops-grid { grid-template-columns: 1fr; gap: 12px; } }
    @media (max-width: 650px) { .primary-btn, .secondary-btn { width: 100%; } .tools-cron-btn, .ops-body .group-action { width: auto; } .section-body { padding: 12px; } .index-confirm-dialog { grid-template-columns: 1fr; } .index-confirm-actions { flex-direction: column-reverse; } .ops-body .item { flex-wrap: nowrap; } .ops-body .item-right { width: auto; justify-content: flex-end; margin-top: 0; } }

    #auth-overlay { position: fixed; top: 64px; right: 0; bottom: calc(44px + env(safe-area-inset-bottom)); left: 0; background: #f1f5f9; display: flex; justify-content: center; align-items: center; z-index: 90; }
    .auth-card { background: #fff; padding: 35px 30px; border-radius: var(--radius-card); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); width: 340px; text-align: center; box-sizing: border-box; border: 1px solid #e2e8f0; }
    .auth-icon { font-size: 32px; margin-bottom: 20px; }
    .auth-btn { width: 100%; justify-content: center; padding: 12px; font-size: 14px; }
    .auth-input { text-align: center; letter-spacing: 2px; margin-bottom: 20px; padding: 12px; }
    .auth-input-error { border-color: #ef4444; background: #fff1f2; animation: authShake 0.32s ease-in-out; }
    .auth-input-error:focus { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.14); }
    @keyframes authShake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(7px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(4px); }
    }

    /* Toast 通知 */
    #toast-container { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; flex-direction: column; align-items: center; gap: 10px; width: auto; max-width: 92vw; pointer-events: none; }
    .toast { --toast-accent: #2563eb; position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr) 24px; align-items: center; gap: 10px; width: max-content; min-width: min(340px, 92vw); max-width: min(92vw, 520px); padding: 12px 11px 13px 12px; overflow: hidden; border: 1px solid #dbe4ee; border-radius: var(--radius-card); background: rgba(255,255,255,0.97); color: #334155; font-size: 13px; line-height: 1.45; font-weight: 600; letter-spacing: 0.1px; box-shadow: 0 16px 36px -20px rgba(15,23,42,0.45), 0 6px 16px -10px rgba(15,23,42,0.2); opacity: 0; transform: translateY(-12px) scale(0.98); transition: opacity 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease; text-align: left; word-break: break-word; pointer-events: auto; }
    .toast.show { opacity: 1; transform: translateY(0) scale(1); box-shadow: 0 18px 42px -20px rgba(15,23,42,0.5), 0 8px 18px -10px rgba(15,23,42,0.24); }
    .toast-icon { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-circle); background: color-mix(in srgb, var(--toast-accent) 12%, white); color: var(--toast-accent); font-size: 15px; line-height: 1; font-weight: 800; }
    .toast-message { min-width: 0; }
    .toast-close { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: var(--radius-circle); background: transparent; color: #94a3b8; font: inherit; font-size: 17px; line-height: 1; cursor: pointer; }
    .toast-close:hover { background: #f1f5f9; color: #475569; }
    .toast-progress { position: absolute; left: 0; bottom: 0; width: 100%; height: 3px; background: var(--toast-accent); transform-origin: left center; animation: toastProgress var(--toast-duration) linear forwards; }
    .toast.paused .toast-progress { animation-play-state: paused; }
    .toast.success { --toast-accent: #16a34a; border-color: #bbf7d0; }
    .toast.warning { --toast-accent: #d97706; border-color: #fde68a; }
    .toast.error { --toast-accent: #dc2626; border-color: #fecaca; }
    @keyframes toastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
    @media (max-width: 520px) { .toast { min-width: min(300px, 92vw); grid-template-columns: 26px minmax(0, 1fr) 24px; } }
`;
