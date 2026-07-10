import baseCSS from "./base.js";

export default `${baseCSS}
    .container { flex: 1; max-width: 900px; display: flex; flex-direction: column; gap: 20px; }

    .table-title { padding: 15px 20px; font-weight: 600; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; background: #fff; color: #0f172a; font-size: 15px; box-sizing: border-box; }
    .section-body { padding: 25px 20px; box-sizing: border-box; }
    .section-body-compact { padding-top: 20px; padding-bottom: 20px; }

    .flex-row { display: flex; justify-content: space-between; align-items: center; gap: 15px; }
    .tool-info-title { font-weight: 600; color: #0f172a; margin-bottom: 4px; }
    .tool-info-desc { font-size: 13px; color: #64748b; }
    .tool-info-desc-spaced { margin-bottom: 20px; }

    .ops-body .list { display: flex; flex-direction: column; gap: 4px; }
    .ops-body .item { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; transition: 0.2s; border: 1px solid transparent; }
    .ops-body .item:hover { background: #f8fafc; border-color: #e2e8f0; }
    .ops-body .item-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; cursor: pointer; }
    .ops-body .item-chk { width: 16px; height: 16px; accent-color: #2563eb; flex-shrink: 0; }
    .ops-body .item-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ops-body .item-right { display: flex; gap: 4px; flex-shrink: 0; align-items: center; }
    .ops-body .group-header { display: flex; align-items: center; gap: 8px; padding: 12px 12px 6px 12px; }
    .ops-body .group-chk { width: 16px; height: 16px; accent-color: #2563eb; flex-shrink: 0; cursor: pointer; }
    .ops-body .group-label { font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; flex: 1; }
    .ops-body .item-sep { height: 1px; background: #f1f5f9; margin: 4px 0; }
    .ops-body .ops-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px; }
    .tools-error-alert { box-sizing: border-box; width: calc(100% - 24px); margin: 0 12px 12px; padding: 12px 14px; border: 1px solid #fdba74; border-left: 4px solid #f97316; border-radius: 12px; color: #9a3412; background: #fff7ed; font-size: 13px; line-height: 1.55; }
    .tools-error-alert strong { display: block; color: #c2410c; font-size: 13px; margin-bottom: 4px; }
    .tools-error-alert span { color: #9a3412; overflow-wrap: anywhere; }

    .index-confirm-overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(15,23,42,0.38); z-index: 1001; padding: 20px; }
    .index-confirm-overlay.open { display: flex; }
    .index-confirm-dialog { width: min(420px, 100%); background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 24px 60px rgba(15,23,42,0.22); padding: 20px; display: grid; grid-template-columns: auto 1fr; gap: 14px; }
    .index-confirm-icon { width: 38px; height: 38px; border-radius: 8px; background: #eff6ff; color: #1d4ed8; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; line-height: 1; }
    .index-confirm-content { min-width: 0; }
    .index-confirm-content h2 { margin: 0 0 8px; font-size: 16px; line-height: 1.35; color: #0f172a; letter-spacing: 0; }
    .index-confirm-flow { font-size: 12px; line-height: 1.45; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; overflow-wrap: anywhere; }
    .index-confirm-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
    .index-confirm-actions .primary-btn, .index-confirm-actions .secondary-btn { min-width: 96px; }

    .qr-list-container { max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: #f8fafc; margin-bottom: 15px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .qr-item { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; box-sizing: border-box; }
    .qr-label { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: 0.2s; border: 1px solid transparent; background: transparent; flex: 1; min-width: 0; }
    .qr-label:hover { background: #fff; border-color: #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .qr-name { font-weight: 600; color: #1e293b; font-size: 14px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .qr-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .fill-btn { background: #fff; color: #2563eb; border: 1px solid #bfdbfe; padding: 6px 10px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; transition: 0.2s; margin: 0; flex-shrink: 0; }
    .fill-btn:hover { background: #eff6ff; border-color: #93c5fd; }
    .delete-btn { background: #fff; color: #dc2626; border: 1px solid #fecaca; padding: 6px 10px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; transition: 0.2s; margin: 0; flex-shrink: 0; }
    .delete-btn:hover { background: #fef2f2; border-color: #fca5a5; }
    .icon-btn:disabled, .primary-btn:disabled, .secondary-btn:disabled, .fill-btn:disabled, .delete-btn:disabled { opacity: 0.7; cursor: wait; }
    .view-select { width: auto; min-width: 80px; padding: 6px 28px 6px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; color: #0f172a; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 8px center; -webkit-appearance: none; appearance: none; cursor: pointer; flex-shrink: 0; }
    .view-select:focus { border-color: #2563eb; outline: none; }

    @media (max-width: 650px) { .flex-row { flex-direction: column; align-items: stretch; text-align: left; } .primary-btn, .secondary-btn { width: 100%; } .index-confirm-dialog { grid-template-columns: 1fr; } .index-confirm-actions { flex-direction: column-reverse; } .qr-list-container { grid-template-columns: 1fr; } .ops-actions { flex-direction: column; } .ops-body .item { flex-wrap: wrap; } .ops-body .item-right { width: 100%; justify-content: flex-end; margin-top: 4px; } }

    #auth-overlay { position: fixed; top: 64px; right: 0; bottom: 0; left: 0; background: #f1f5f9; display: flex; justify-content: center; align-items: center; z-index: 90; }
    .auth-card { background: #fff; padding: 35px 30px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); width: 340px; text-align: center; box-sizing: border-box; border: 1px solid #e2e8f0; }
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
    #toast-container { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; width: auto; max-width: 92vw; }
    .toast { display: inline-flex; align-items: center; width: fit-content; max-width: min(92vw, 460px); color: #1e293b; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); border: 1px solid #d9ecff; padding: 11px 14px; border-radius: 14px; font-size: 13px; line-height: 1.45; font-weight: 600; letter-spacing: 0.1px; box-shadow: 0 12px 28px -18px rgba(14,116,144,0.45), 0 3px 10px rgba(148,163,184,0.18); opacity: 0; transform: translateY(-10px) scale(0.985); transition: opacity 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease; text-align: left; word-break: break-word; }
    .toast.show { opacity: 1; transform: translateY(0) scale(1); box-shadow: 0 14px 30px -18px rgba(14,116,144,0.5), 0 4px 12px rgba(148,163,184,0.2); }
    .toast.success { background: linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%); border-color: #86efac; color: #166534; }
    .toast.warning { background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%); border-color: #fcd34d; color: #92400e; }
    .toast.error { background: linear-gradient(180deg, #fff7ed 0%, #fff1f2 100%); border-color: #fdba74; color: #9a3412; }
`;
