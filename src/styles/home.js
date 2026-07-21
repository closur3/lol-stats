import baseCSS from "./base.js";

export default `${baseCSS}
    .container { --table-label-width: 80px; max-width: 1400px; }
    .wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 25px; display: flex; flex-direction: column; }
    .wrapper::-webkit-scrollbar, .match-list::-webkit-scrollbar { display: none; }
    .wrapper, .match-list { -ms-overflow-style: none; scrollbar-width: none; }
    table { width: 100%; min-width: 1150px; border-collapse: separate; border-spacing: 0; font-size: 14px; table-layout: fixed; margin: 0; border: none; }
    .stats-table { min-width: 1340px; }
    th { background: #f8fafc; padding: 14px 8px; font-weight: 600; color: #64748b; cursor: pointer; transition: 0.2s; box-shadow: inset -1px -1px 2px rgba(0, 0, 0, 0.05); border: none !important; }
    th:hover { background: #eff6ff; color: #2563eb; }
    td { padding: 12px 8px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: inset -1px -1px 2px rgba(0, 0, 0, 0.04); border: none !important; }
    tr { border: none !important; }
    .team-col { position: sticky; left: 0; background: white !important; z-index: 10; text-align: left; font-weight: 600; padding-left: 15px; width: var(--table-label-width); transition: 0.2s; box-shadow: inset 1px 0 2px rgba(0, 0, 0, 0.04), inset -1px -1px 2px rgba(0, 0, 0, 0.04) !important; border: none !important; outline: none !important; }
    .team-clickable { cursor: pointer; }
    .team-clickable:hover, .time-table-cell:not(.is-empty):hover { color: #2563eb !important; background-color: #eff6ff !important; }
    .table-title { font-weight: 600; display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: var(--radius-card) var(--radius-card) 0 0; border: 1px solid #e2e8f0; border-bottom: none; box-sizing: border-box; min-height: 72px; padding: 12px 16px; }
    .table-title + .wrapper { border-top: none; border-radius: 0 0 var(--radius-card) var(--radius-card); }
    .tournament-title-text { color: #0f172a; font-weight: 600; line-height: 1.3; }
    .tournament-title-row { display: flex; align-items: center; gap: 6px; }
    .tournament-title-row .schedule-phase-icon { width: 18px; height: 18px; flex-shrink: 0; }
    .schedule-phase-icon-play { color: #1d4ed8; }
    .schedule-phase-icon-idle { color: #5b21b6; }
    .schedule-phase-icon-done { color: #166534; }
    .schedule-phase-icon-offday { color: #475569; }
    .table-title .tournament-jump-btn { display: inline-flex; align-items: center; justify-content: center; color: #0f172a; text-decoration: none; flex-shrink: 0; line-height: 1; }
    .table-title .tournament-jump-btn svg { width: 13px; height: 13px; stroke-width: 2.6; }
    .table-title .tournament-jump-btn:hover { color: #2563eb; }
    details.home-sec { margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: var(--radius-card); box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; }
    details.home-sec > summary.table-title { cursor: pointer; user-select: none; list-style: none; transition: background 0.2s; background: var(--gradient-header); box-shadow: inset 1px 0 2px rgba(0, 0, 0, 0.04), inset -1px 0 2px rgba(0, 0, 0, 0.04); }
    details.home-sec > summary.table-title::-webkit-details-marker { display: none; }
    details.home-sec > .table-title { border: none; border-radius: 0; box-shadow: none; }
    details.home-sec > .wrapper { margin-bottom: 0; border: none; border-radius: 0; box-shadow: none; }
    details.home-sec[open] > summary.table-title { border-radius: var(--radius-card) var(--radius-card) 0 0; border-bottom: none; }
    details.home-sec:not([open]) > summary.table-title { border-radius: var(--radius-card); border-bottom: 1px solid #e2e8f0; }
    .home-indicator { font-size: 18px; color: #2563eb; font-weight: 600; transition: transform 0.3s ease; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex-shrink: 0; margin-right: 8px; }
    details.home-sec[open] .home-indicator { transform: rotate(90deg); }
    .table-title a { color: #2563eb; text-decoration: none; }
    .col-bo3 { width: 90px; } .col-bo3-pct { width: 90px; } .col-bo5 { width: 90px; } .col-bo5-pct { width: 90px; }
    .col-series { width: 90px; } .col-series-wr { width: 90px; } .col-game { width: 90px; } .col-game-wr { width: 90px; }
    .width-team { width: var(--table-label-width); } .width-streak { width: 70px; } .width-last { width: 110px; }
    .col-streak { width: 70px; } .col-last { width: 110px; }
    .col-bo3, .col-bo3-pct, .col-bo5, .col-bo5-pct, .col-series, .col-series-wr, .col-game, .col-game-wr, .col-series-trailed, .col-series-trailed-pct, .col-series-led, .col-series-led-pct, .col-streak, .col-last, .sch-time, .sch-fin-score, .sch-live-score { font-variant-numeric: tabular-nums; font-weight: 600; letter-spacing: 0; }
    .metric-record { padding-right: 2px; }
    .metric-rate { padding-left: 2px; }
    .spine-row { display: flex; justify-content: center; align-items: stretch; width: 100%; height: 100%; }
    .spine-l { flex: 1; flex-basis: 0; display: flex; align-items: center; justify-content: flex-end; padding: 0; font-weight: 600; transition: background 0.15s; }
    .spine-r { flex: 1; flex-basis: 0; display: flex; align-items: center; justify-content: flex-start; padding: 0; font-weight: 600; transition: background 0.15s; }
    .spine-sep { width: 12px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; }
    .spine-strong { font-weight: 700; }
    .spine-sep-muted { opacity: 0.4; }
    .muted-dash { color: #cbd5e1; }
    .sch-row .spine-l { padding: 4px 5px; margin-left: 0; }
    .sch-row .spine-r { padding: 4px 5px; margin-right: 0; }
    .spine-l.clickable:hover, .spine-r.clickable:hover, .spine-sep.clickable:hover { background-color: #eff6ff; color: #2563eb; cursor: pointer; }
    .t-cell { display: flex; align-items: center; width: 100%; height: 100%; }
    .t-val { flex: 1; flex-basis: 0; text-align: right; font-weight: 600; padding-right: 4px; white-space: nowrap; }
    .t-pct { flex: 1; flex-basis: 0; text-align: left; opacity: 0.9; font-size: 11px; font-weight: 600; padding-left: 4px; white-space: nowrap; }
    .time-table-block { width: 100%; }
    .time-table { font-variant-numeric: tabular-nums; border-top: none; }
    .time-header-row { border-bottom: none; }
    .time-header-cell { cursor: default; pointer-events: none; }
    .time-total-row { font-weight: bold; background: #f8fafc; }
    .time-total-label { background: #f1f5f9 !important; }
    .time-filter-cell { pointer-events: auto; vertical-align: middle; text-align: center !important; padding: 8px 4px !important; cursor: default; }
    .time-box-select { appearance: none; -webkit-appearance: none; width: 68px; height: 26px; border: 1px solid #dbe4ef; border-radius: var(--radius-control); background-color: #ffffff; background-image: linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%); background-position: calc(100% - 12px) 10px, calc(100% - 8px) 10px; background-size: 4px 4px, 4px 4px; background-repeat: no-repeat; color: #334155; font-size: 11px; font-weight: 700; cursor: pointer; outline: none; padding: 0 18px 0 9px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04); }
    .time-box-select:hover { border-color: #93c5fd; color: #1d4ed8; background-color: #f8fbff; }
    .time-box-select:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.12); }
    .time-table-cell { color: #ffffff; font-weight: 600; cursor: pointer; }
    .time-table-cell.is-empty { background: #f1f5f9 !important; color: #cbd5e1; cursor: default; }
    .time-empty { color: #cbd5e1; }
    .is-empty-stat { background: #f1f5f9; color: #cbd5e1; }
    .rate-cell { font-weight: 700; }
    .col-last { font-weight: 700; }
    .floating-actions { position: fixed; left: calc(50vw + min(700px, calc(50vw - 15px)) + 12px); top: 78%; transform: translateY(-50%); z-index: 80; display: flex; flex-direction: column; gap: 4px; padding: 4px; border: 1px solid rgba(226,232,240,0.92); border-radius: var(--radius-card); background: rgba(255,255,255,0.9); box-shadow: 0 14px 32px rgba(15,23,42,0.12); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
    .floating-action-btn { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: var(--radius-control); background: transparent; color: #475569; cursor: pointer; transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease, transform 0.16s ease; }
    .floating-action-btn:hover { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; transform: translateY(-1px); }
    .floating-action-btn:focus-visible { outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.16); }
    .floating-action-btn:disabled { color: #cbd5e1; cursor: default; transform: none; }
    .floating-action-icon { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    .floating-action-btn .icon-collapse { display: none; }
    .floating-action-btn[data-action-state="collapse"] .icon-expand { display: none; }
    .floating-action-btn[data-action-state="collapse"] .icon-collapse { display: block; }
    .floating-actions-anchor { display: none; }
    .badge { color: white; border-radius: var(--radius-badge); padding: 3px 7px; font-size: 11px; font-weight: 600; }
    .badge-win { background: #10b981; }
    .badge-loss { background: #f43f5e; }
    .sch-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 40px; width: 100%; align-items: start; }
    .sch-card { background: #fff; border-radius: var(--radius-card); box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; }
    .sch-header { padding: 12px 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155; display:flex; justify-content:space-between; }
    .sch-count { font-size: 11px; opacity: 0.6; }
    .sch-body { display: flex; flex-direction: column; flex: 1; padding-bottom: 0; }
    .sch-group-header { border-bottom: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; padding: 4px 0; color: #475569; font-size: 11px; letter-spacing: 0.5px; }
    .sch-group-row { width: 100%; padding: 0 10px; box-sizing: border-box; }
    .sch-group-name { font-weight: 700; }
    .sch-group-block { font-weight: 700; opacity: 0.7; }
    .sch-group-header .spine-l { justify-content: flex-end; padding-right: 2px; }
    .sch-group-header .spine-r { justify-content: flex-start; padding-left: 2px; opacity: 0.7; }
    .sch-group-header:first-child { border-top: none; }
    .sch-row { display: flex; align-items: stretch; padding: 0; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #334155; min-height: 36px; flex: 0 0 auto; }
    .sch-time { width: 54px; color: #94a3b8; font-size: 12px; display: flex; align-items: center; justify-content: center; padding: 0; }
    .sch-tag-col { width: 54px; display: flex; align-items: center; justify-content: center; padding: 0; }
    .sch-vs-container { flex: 1; display: flex; align-items: stretch; justify-content: center; }
    .sch-tag-col .best-of-pill { font-size: 12px; }
    .sch-live-score { color: #10b981; font-size: 13px; }
    .sch-fin-score { color: #334155; font-size: 13px; }
    .sch-mid-cell { display: flex; justify-content: center; align-items: center; width: 34px; transition: background 0.2s; }
    .vs-text { color: #94a3b8; font-size: 13px; font-weight: 700; margin: 0 2px; }
    .score-sep { opacity: 0.4; margin: 0 1px; }
    .score-win { color: #0f172a; }
    .score-draw { color: #64748b; }
    .score-loss { color: #94a3b8; }
    .tbd-team { color: #9ca3af; }
    .match-forfeit { margin-left: 3px; color: #b45309; font-size: 10px; font-weight: 700; vertical-align: 1px; }
    .rate-hint { font-weight: 400; color: #94a3b8; font-size: 11px; margin: 0 2px; }
    .sch-empty { margin-top: 40px; text-align: center; color: #94a3b8; background: #fff; padding: 30px; border-radius: var(--radius-card); border: 1px solid #e2e8f0; font-weight: 600; }
    .arch-empty-msg { text-align: center; padding: 40px; color: #94a3b8; }

    .tournament-summary { font-size:12px; color:#64748b; font-weight: 600; background:#f8fafc; padding:4px 10px; border-radius:var(--radius-control); border:1px solid #e2e8f0; display:inline-flex; align-items:center; white-space:nowrap; }
    .tournament-summary-rate { opacity: 0.7; font-weight: 400; }
    .summary-sep { opacity:0.3; margin:0 8px; font-weight:400; }
    .title-right-area { display:flex; align-items:center; gap:12px; justify-content: flex-start; }

    @media (max-width: 1100px) { .sch-container { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 650px) {
        .table-title { flex-wrap: wrap; gap: 0; padding: 12px 15px 0 15px; }
        .container { padding-bottom: 31px; }
        .table-title { display: flex; flex-direction: column; align-items: flex-start; padding: 0; background: #fff; border-bottom: none; width: 100%; border-radius: var(--radius-card) var(--radius-card) 0 0; }
        .table-title > div:first-child { width: 100%; padding: 8px 15px; display: flex; align-items: center; flex: 1 1 0; gap: 6px; min-width: 0; }
        .table-title > div:first-child .tournament-title-text { white-space: normal; line-height: 1.4; word-break: break-word; }
        .table-title .title-right-area { margin-top: 0 !important; padding: 8px 15px !important; align-items: center; display: flex; flex: 1 1 0; justify-content: flex-end !important; }
        .title-right-area { width: 100%; justify-content: flex-end !important; padding: 10px 15px 12px 15px; border-top: 1px dashed #e2e8f0; margin-top: 8px; display: flex; }
        .tournament-summary { font-size: 11px; padding: 3px 8px; }
        .time-box-select { width: 66px; }
        .floating-actions { position: fixed; top: auto; right: auto; left: 50%; bottom: max(12px, env(safe-area-inset-bottom)); transform: translateX(-50%); flex-direction: row; gap: 6px; padding: 5px; border-radius: var(--radius-card); }
        .floating-actions-anchor { display: block; height: 50px; margin: 0 auto 16px auto; pointer-events: none; }
        body.page-archive .floating-actions-anchor { height: 26px; }
        .floating-action-btn { width: 38px; height: 38px; border-radius: var(--radius-control); }
        .floating-action-icon { width: 18px; height: 18px; }
        details.home-sec > summary.table-title { min-height: 72px; }
        .table-title .tournament-jump-btn svg { width: 13px; height: 13px; }
    }
    @media (max-width: 650px) { .sch-container { grid-template-columns: 1fr; } }

    @keyframes modalShow { 0% { opacity: 0; transform: translate(-50%, -45%) scale(0.98); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
    .modal { --modal-vertical-inset: max(40px, 6dvh); display: none; position: fixed; z-index: 999; left: 0; top: 0; width: 100%; height: 100dvh; overflow: hidden; background-color: rgba(15, 23, 42, 0.45); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
    .modal-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: #ffffff; margin: 0; padding: 0; border: 1px solid #e2e8f0; width: 90%; max-width: 420px; border-radius: var(--radius-card); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: modalShow 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; display: flex; flex-direction: column; max-height: calc(100dvh - var(--modal-vertical-inset)); }
    #modalTitle { margin: 0; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; font-size: 18px; font-weight: 600; color: #0f172a; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; background: #f8fafc; border-radius: var(--radius-card) var(--radius-card) 0 0; flex-shrink: 0; }
    #modalTitle.history-status-modal-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 14px; padding-bottom: 14px; }
    .modal-title-copy { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .modal-context-label { display: block; margin-bottom: 7px; color: #94a3b8; font-size: 9px; font-weight: 800; letter-spacing: 0.16em; line-height: 1; }
    .modal-context-title { display: flex; align-items: baseline; gap: 8px; color: #0f172a; font-size: 17px; font-weight: 750; }
    .modal-title-record { font-variant-numeric: tabular-nums; }
    .modal-context-divider { color: #cbd5e1; font-weight: 500; }
    .match-list { margin: 0; padding: 16px 24px; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; flex: 1; }
    .history-status-modal-title + .match-list { padding-top: 10px; padding-bottom: 10px; }
    .match-list::-webkit-scrollbar { width: 6px; }
    .match-list::-webkit-scrollbar-track { background: transparent; }
    .match-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: var(--radius-pill); }
    .match-list::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .match-item { display: flex; flex-direction: column; align-items: stretch; background: #ffffff; border: 1px solid #cbd5e1; border-radius: var(--radius-card); margin-bottom: 12px; padding: 12px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: all 0.2s ease; min-height: 48px; }
    .match-item:last-child { margin-bottom: 0; }
    .match-card { padding: 0; overflow: hidden; border-color: #dbe3ec; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04); }
    .match-card-meta { display: flex; align-items: center; justify-content: space-between; min-height: 32px; padding: 0 12px; border-bottom: 1px solid #edf2f7; background: #f8fafc; color: #64748b; font-size: 11px; font-weight: 650; font-variant-numeric: tabular-nums; }
    .match-card-meta > span:first-child { display: flex; align-items: center; gap: 7px; }
    .match-card-meta b { color: #334155; font-size: 12px; }
    .match-card-tags { display: flex; align-items: center; gap: 8px; }
    .match-card-fixture { display: grid; grid-template-columns: minmax(0, 1fr) 58px minmax(0, 1fr); align-items: center; min-height: 54px; padding: 5px 18px; }
    .match-card-team { min-width: 0; color: #475569; font-size: 14px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .match-card-team-left { text-align: right; padding-right: 10px; }
    .match-card-team-right { text-align: left; padding-left: 10px; }
    .match-card-team-winner { color: #0f172a; font-weight: 800; }
    .match-card-team-loser { color: #94a3b8; }
    .match-card-score-box { display: flex; align-items: center; justify-content: center; min-height: 30px; border: 1px solid #e2e8f0; border-radius: var(--radius-control); background: #ffffff; }
    .match-card-score-box.is-full { border-color: #fdba74; background: #fff7ed; box-shadow: inset 0 0 0 1px #fed7aa; }
    .match-card-score { color: #1e293b; font-size: 16px; font-weight: 750; font-variant-numeric: tabular-nums; }
    .match-card-score.is-live { color: #10b981; }
    .match-card-score-box.is-full .match-card-score { color: #c2410c; }
    .match-card-vs { color: #94a3b8; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; }
    .match-card .match-details { margin: 0 12px 10px; padding-top: 9px; }
    .history-section-divider { display: flex; align-items: center; gap: 8px; margin: 18px 0 10px; color: #94a3b8; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; }
    .history-section-divider::before, .history-section-divider::after { content: ''; flex: 1; height: 1px; background: #dbe3ec; }
    .history-tournament-group { margin: 0 0 10px; border: 1px solid #dbe3ec; border-radius: var(--radius-card); background: #ffffff; overflow: hidden; }
    .history-group-summary { position: relative; display: flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 48px; background: #f8fafc; color: #334155; cursor: pointer; list-style: none; font-size: 11px; font-weight: 750; }
    .history-group-summary::-webkit-details-marker { display: none; }
    .history-group-summary::before { content: ''; position: absolute; left: 14px; width: 6px; height: 6px; border-right: 1.5px solid #64748b; border-bottom: 1.5px solid #64748b; transform: rotate(-45deg); transition: transform 0.15s ease; }
    .history-tournament-group[open] > .history-group-summary::before { transform: rotate(45deg); }
    .history-group-summary > span:first-child { min-width: 0; max-width: 100%; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
    .history-group-count { flex-shrink: 0; color: #64748b; font-size: 9px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .history-group-summary > .history-group-count { position: absolute; right: 12px; }
    .history-group-meta { position: absolute; right: 12px; display: flex; align-items: center; gap: 8px; }
    .history-group-record { display: inline-flex; align-items: center; gap: 3px; min-width: 31px; justify-content: center; padding: 3px 6px; border: 1px solid #dbe4ef; border-radius: var(--radius-pill); background: #ffffff; color: #334155; font-size: 10px; line-height: 1; font-variant-numeric: tabular-nums; }
    .history-group-record b { color: #334155; }
    .history-group-record i { color: #64748b; font-style: normal; font-weight: 500; }
    .history-tab-group { padding-top: 7px; }
    .history-tournament-group[open] > .history-tab-group:last-child { padding-bottom: 8px; }
    .history-tab-label { padding: 0 12px 3px; color: #64748b; font-size: 10px; font-weight: 750; letter-spacing: 0.03em; }
    .history-group-list { padding: 8px 10px 0; }
    .history-status-switch { flex: 0 0 auto; }
    .history-status-switch-control { display: grid; grid-template-columns: 44px; gap: 2px; }
    .history-status-button { display: inline-flex; align-items: center; justify-content: space-between; gap: 5px; width: 44px; height: 22px; padding: 0 7px; border: 0; border-radius: var(--radius-badge); outline: none; background: transparent; color: #94a3b8; cursor: pointer; font: inherit; transition: background 0.15s ease, color 0.15s ease; }
    .history-status-button:hover { background: #f1f5f9; color: #475569; }
    .history-status-button.is-active { background: #e2e8f0; color: #334155; }
    .history-status-button:focus-visible { box-shadow: 0 0 0 2px #bfdbfe; }
    .history-status-button svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .history-status-button span { color: inherit; font-size: 9px; font-weight: 750; font-variant-numeric: tabular-nums; }
    .history-status-view.is-hidden { display: none; }
    .history-status-empty { padding: 28px 12px; color: #94a3b8; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; }
    .h2h-tournament-group { margin: 0 0 8px; border: 1px solid #dbe3ec; border-radius: var(--radius-card); background: #ffffff; overflow: hidden; }
    .history-status-view > .h2h-tournament-group:last-child { margin-bottom: 0; }
    .h2h-group-heading { position: relative; display: flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 48px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; color: #334155; font-size: 11px; font-weight: 750; }
    .h2h-group-heading > span:first-child { min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
    .h2h-group-heading > .h2h-group-meta { position: absolute; right: 12px; }
    .h2h-tournament-group > .history-tab-group:last-child { padding-bottom: 8px; }
    .match-details { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; min-height: 26px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
    .match-details::after { content: ''; position: absolute; top: 10px; bottom: 0; left: 50%; width: 1px; background: #e2e8f0; transform: translateX(-0.5px); }
    .match-details.game-only { grid-template-columns: minmax(0, 1fr); }
    .match-details.game-only::after { display: none; }
    .match-details.game-only .game-results { justify-content: center; padding-right: 0; }
    .match-result { font-size: 13px; font-weight: 800; letter-spacing: 0.04em; }
    .match-result-win { color: #059669; }
    .match-result-loss { color: #e11d48; }
    .match-result-draw { color: #d97706; }
    .match-result-next { color: #64748b; }
    .match-result-live { color: #0284c7; }
    .turnaround-event { display: flex; justify-content: flex-start; min-width: 0; padding-left: 12px; }
    .turnaround-badge { display: inline-flex; align-items: center; min-height: 18px; padding: 2px 7px; border-radius: var(--radius-pill); font-size: 9px; font-weight: 700; letter-spacing: 0.05em; }
    .turnaround-icon { display: inline-flex; align-items: center; margin-right: 4px; font-size: 11px; line-height: 1; letter-spacing: 0; }
    .turnaround-icon svg { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .turnaround-comeback { background: #dbeafe; color: #1d4ed8; box-shadow: inset 0 0 0 1px #60a5fa; }
    .turnaround-lost-lead { background: #fce7f3; color: #be185d; box-shadow: inset 0 0 0 1px #f472b6; }
    .turnaround-reverse-sweep { background: #dcfce7; color: #166534; box-shadow: inset 0 0 0 1px #4ade80; }
    .turnaround-reverse-swept { background: #fee2e2; color: #b91c1c; box-shadow: inset 0 0 0 1px #f87171; }
    .game-results { display: flex; justify-content: flex-end; gap: 4px; min-width: 0; padding-right: 12px; }
    .game-result { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: var(--radius-badge); color: #ffffff; font-size: 10px; font-weight: 700; }
    .game-result-win { background: #10b981; }
    .game-result-loss { background: #f43f5e; }
    .best-of-pill { padding: 2px 6px; border-radius: var(--radius-badge); font-size: 13px; font-weight: 600; display: inline-block; line-height: normal; }
    .best-of-pill.bo1, .best-of-pill.bo2 { background: #e2e8f0; color: #475569; }
    .best-of-pill.bo3 { background: #dbeafe; color: #1d4ed8; }
    .best-of-pill.bo5 { background: #f2d49c; color: #9c5326; }
    @media (max-width: 650px) {
        .modal { --modal-vertical-inset: clamp(120px, 26dvh, 220px); }
        .modal-content { width: calc(100% - 32px); }
        .match-item { padding: 10px 8px; }
        .match-card { padding: 0; }
        .match-card-fixture { padding: 5px 10px; }
        .spine-l { padding-right: 2px; }
        .spine-r { padding-left: 2px; }
    }
`;
