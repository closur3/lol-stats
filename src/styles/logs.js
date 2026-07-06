import baseCSS from "./base.js";

export default `${baseCSS}
    .logs-cards-container { max-width: 1000px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .league-card { --card-x-pad: 16px; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: var(--shadow-card); overflow: hidden; height: 300px; display: flex; flex-direction: column; }
    .league-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
    .league-card-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .league-card-name { font-weight: 600; font-size: 16px; color: #0f172a; }
    .league-total-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 22px; padding: 0 8px; border-radius: 999px; background: #e2e8f0; color: #334155; font-size: 12px; font-weight: 700; line-height: 1; }
    .league-card-status { display: flex; align-items: center; gap: 6px; }
    .phase-tag { display: inline-flex; align-items: center; justify-content: center; min-height: 22px; font-size: 12px; font-weight: 600; line-height: 1; padding: 4px 8px; border-radius: 4px; transform: translateY(-1px); }
    .phase-emoji { display: inline-block; line-height: 1; margin-right: 1px; }
    .phase-emoji-play { transform: translateY(-1.5px); }
    .phase-emoji-idle, .phase-emoji-done, .phase-emoji-offday { transform: translateY(0); }
    .phase-play { background: #dbeafe; color: #1d4ed8; }
    .phase-done { background: #e0e7ff; color: #4338ca; }
    .phase-offday { background: #dcfce7; color: #166534; }
    .phase-idle { background: #e2e8f0; color: #334155; }
    .card-stats { display: flex; gap: 16px; padding: 8px var(--card-x-pad); font-size: 12px; color: #94a3b8; border-bottom: 1px solid #f8fafc; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .stat-val { color: #0f172a; font-weight: 600; }
    .timeline { display: flex; gap: 2px; height: 16px; align-items: flex-end; padding: 6px 16px 0 16px; border-bottom: 1px solid #f8fafc; }
    .bar { flex: 1; border-radius: 2px 2px 0 0; min-width: 3px; }
    .bar-tall { height: 100%; }
    .bar-mid { height: 70%; }
    .bar-low { height: 30%; }
    .bar-sync { background: #22c55e; }
    .bar-idle { background: #e2e8f0; }
    .bar-err { background: #ef4444; }
    .league-card-logs { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
    .league-card-logs::-webkit-scrollbar { display: none; }
    .log-mini-row { display: flex; align-items: baseline; gap: 0; padding: 6px var(--card-x-pad); border-bottom: 1px solid #f8fafc; font-size: 13px; }
    .log-mini-row:last-child { border-bottom: none; }
    .log-mini-time { color: #94a3b8; font-size: 12px; white-space: nowrap; flex: 0 0 auto; min-width: 0; font-weight: 500; }
    .log-mini-msg { color: #64748b; word-break: break-all; line-height: 1.4; font-size: 13px; font-weight: 500; }
    .log-mini-msg .hl { color: #0f172a; font-weight: 600; }
    .log-trigger-link { color: inherit; text-decoration: none; }
    .log-trigger-link:hover { color: #1d4ed8; text-decoration: underline; }
    .empty-logs { padding: 40px; text-align: center; color: #94a3b8; grid-column: 1 / -1; }
    @media (max-width: 650px) {
        .logs-cards-container { grid-template-columns: 1fr; }
        .league-card { --card-x-pad: 16px; }
        .league-card-header { padding: 10px 16px; }
        .log-mini-row { flex-direction: column; align-items: flex-start; gap: 2px; }
        .log-mini-time { width: auto; min-width: 0; font-size: 11px; line-height: 1.2; }
        .log-mini-msg { width: 100%; word-break: break-word; line-height: 1.35; text-align: left; }
    }
`;
