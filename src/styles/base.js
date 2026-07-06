import footerCSS from "./footer.js";

export default `* { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
        --color-bg: #f1f5f9;
        --color-surface: #ffffff;
        --color-surface-muted: #f8fafc;
        --color-border: #e2e8f0;
        --color-border-strong: #cbd5e1;
        --color-text: #0f172a;
        --color-text-muted: #64748b;
        --color-text-faint: #94a3b8;
        --color-primary: #2563eb;
        --color-primary-strong: #1d4ed8;
        --color-primary-soft: #eff6ff;
        --color-danger: #dc2626;
        --gradient-header: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        --radius-card: 12px;
        --radius-control: 8px;
        --radius-tight: 8px;
        --shadow-card: 0 4px 6px rgba(0,0,0,0.05);
    }
    body, code, input, button, select, textarea { font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    body { background: var(--color-bg); color: var(--color-text); margin: 0; padding: 0; overflow-x: hidden; min-height: 100dvh; display: flex; flex-direction: column; }
    body.nav-mobile-open { overflow: hidden; }

    .main-header { position: sticky; top: 0; z-index: 100; background: var(--color-surface); border-bottom: 1px solid var(--color-border); width: 100%; }
    .nav-container { max-width: 1400px; width: 100%; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 64px; }
    .nav-left { display: flex; align-items: center; gap: 8px; }
    .nav-right { display: flex; align-items: center; gap: 24px; }
    .nav-logo { font-size: 1.8rem; line-height: 1; }
    .nav-title { margin: 0; font-size: 1.5rem; font-weight: 600; color: var(--color-text); letter-spacing: 0; }
    .nav-title-link { color: inherit; text-decoration: none; }
    .nav-links { display: flex; align-items: center; gap: 20px; }
    .nav-link { display: inline-flex; align-items: center; padding: 0; font-size: 14px; font-weight: 500; color: var(--color-text-muted); text-decoration: none; transition: color 0.2s; line-height: 64px; border-bottom: 2px solid transparent; }
    .nav-link:hover { color: var(--color-text); }
    .nav-link.active { color: var(--color-text); border-bottom-color: var(--color-text); font-weight: 600; }
    .nav-toggle { display: none; background: none; border: none; cursor: pointer; padding: 8px; color: var(--color-text-muted); }
    .nav-toggle:hover { color: var(--color-text); }
    .nav-toggle svg { width: 20px; height: 20px; }
    .nav-mobile-overlay { display: none; position: fixed; top: 64px; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.25); z-index: 99; }
    .nav-mobile-overlay.open { display: block; }
    .nav-mobile-menu { position: fixed; top: 64px; right: -50vw; width: 50vw; height: calc(100% - 64px); background: var(--color-surface); z-index: 100; transition: right 0.25s ease; box-shadow: -4px 0 12px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
    .nav-mobile-menu.open { right: 0; }
    .nav-mobile-links { display: flex; flex-direction: column; padding: 8px 0; }
    .nav-mobile-link { display: block; padding: 12px 24px; font-size: 15px; font-weight: 500; color: var(--color-text-muted); text-decoration: none; transition: all 0.15s; border-left: 2px solid transparent; }
    .nav-mobile-link:hover { background: var(--color-surface-muted); color: var(--color-text); }
    .nav-mobile-link.active { color: var(--color-text); border-left-color: var(--color-text); font-weight: 600; background: var(--color-surface-muted); }

    .container, .logs-cards-container { max-width: 1400px; width: 100%; margin: 0 auto; padding: 40px 15px; box-sizing: border-box; }
    .wrapper { width: 100%; background: var(--color-surface); border-radius: var(--radius-card); box-shadow: var(--shadow-card); border: 1px solid var(--color-border); overflow: hidden; box-sizing: border-box; }
    .table-title { font-weight: 600; display: flex; align-items: center; background: var(--color-surface); color: var(--color-text); box-sizing: border-box; }
    .empty-state { text-align: center; padding: 40px; color: var(--color-text-faint); }

    .primary-btn, .secondary-btn { padding: 10px 20px; border-radius: var(--radius-tight); font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; transition: 0.2s; margin: 0; white-space: nowrap; }
    .primary-btn { background: var(--color-primary); color: #fff; border: none; }
    .primary-btn:hover { background: var(--color-primary-strong); box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
    .secondary-btn { background: var(--color-surface); color: #475569; border: 1px solid var(--color-border-strong); }
    .secondary-btn:hover { background: var(--color-surface-muted); color: var(--color-text); border-color: var(--color-text-faint); }
    .icon-btn { width: 32px; height: 32px; background: none; border: 1px solid var(--color-border); border-radius: var(--radius-tight); padding: 0; cursor: pointer; color: #475569; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; }
    .icon-btn:hover { background: var(--color-bg); border-color: var(--color-border-strong); color: var(--color-primary-strong); }
    .icon-btn-del { color: var(--color-danger); }
    .icon-btn-del:hover { background: #fef2f2; border-color: #fca5a5; color: var(--color-danger); }
    .ui-icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

    .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-tight); font-size: 14px; color: var(--color-text); box-sizing: border-box; transition: all 0.2s; background: var(--color-surface-muted); }
    .form-input:focus { background: var(--color-surface); border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); outline: none; }
    .form-input::placeholder { color: var(--color-text-faint); }
    .form-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-primary); margin: 0; flex-shrink: 0; }

    @media (max-width: 650px) {
        .nav-links { display: none; }
        .nav-toggle { display: block; }
        .nav-container { padding: 0 16px; }
        .primary-btn, .secondary-btn { width: 100%; }
    }

    ${footerCSS}
`;
