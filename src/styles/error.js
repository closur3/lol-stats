import homeCSS from "./home.js";

export default `${homeCSS}
  .error-layout { width: 100%; }
  .error-content { width: min(620px, 100%); margin: 0 auto; }
  .error-code { color: #dc2626; font-size: 12px; font-weight: 700; margin-bottom: 10px; }
  .error-title { color: #0f172a; font-size: 28px; line-height: 1.25; font-weight: 700; margin: 0 0 10px; }
  .error-detail { color: #64748b; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
  .error-issues { max-height: 340px; margin: 24px 0 0; padding: 0; overflow: auto; list-style: none; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; scrollbar-width: thin; }
  .error-issue { min-height: 44px; display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
  .error-issue:last-child { border-bottom: 0; }
  .error-issue-mark { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
  .error-issue code { color: #334155; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
  .error-actions { display: flex; gap: 10px; margin-top: 24px; }
  .error-action { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; padding: 9px 16px; border: 1px solid #cbd5e1; border-radius: 8px; color: #334155; background: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
  .error-action:hover { color: #1d4ed8; border-color: #93c5fd; background: #eff6ff; }
  .error-action-primary { color: #fff; border-color: #2563eb; background: #2563eb; }
  .error-action-primary:hover { color: #fff; border-color: #1d4ed8; background: #1d4ed8; }
  @media (max-width: 650px) {
    .error-title { font-size: 23px; }
    .error-issue { grid-template-columns: 8px minmax(0, 1fr); gap: 8px 10px; padding: 10px 2px; }
    .error-issue > span:last-child { grid-column: 2; }
    .error-actions { flex-direction: column; }
    .error-action { width: 100%; }
  }
`;
