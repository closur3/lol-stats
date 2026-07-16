import homeCSS from "./home.js";

export default `${homeCSS}
  .error-layout { width: 100%; }
  .error-content { width: min(720px, 100%); margin: 0 auto; }
  .error-code { display: inline-flex; align-items: center; min-height: 24px; margin-bottom: 14px; padding: 3px 8px; border: 1px solid #fecaca; border-radius: 999px; background: #fef2f2; color: #b91c1c; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; }
  .error-title { max-width: 100%; margin: 0 0 8px; color: #0f172a; font-size: clamp(22px, 4vw, 28px); line-height: 1.25; font-weight: 700; overflow-wrap: anywhere; }
  .error-detail { color: #64748b; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
  .error-issues { display: grid; gap: 8px; max-height: min(52vh, 520px); margin: 22px 0 0; padding: 2px 4px 2px 0; overflow: auto; list-style: none; scrollbar-width: thin; }
  .error-issue { display: grid; grid-template-columns: 8px minmax(0, 1fr); align-items: start; gap: 10px; padding: 12px 13px 12px 10px; border: 1px solid #e2e8f0; border-left: 3px solid #f87171; border-radius: 9px; background: #ffffff; color: #64748b; font-size: 12px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03); }
  .error-issue.is-archive { border-left-color: #f59e0b; }
  .error-issue.is-active { border-left-color: #3b82f6; }
  .error-issue-mark { width: 6px; height: 6px; margin-top: 6px; border-radius: 50%; background: #ef4444; }
  .error-issue-content { min-width: 0; }
  .error-issue-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; }
  .error-issue-heading code { min-width: 0; color: #334155; font-size: 12px; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
  .error-issue-count { flex-shrink: 0; color: #94a3b8; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  .error-issue-reasons { display: grid; gap: 5px; margin: 8px 0 0; padding: 0; list-style: none; }
  .error-issue-reasons li { min-width: 0; padding: 6px 8px; border-radius: 6px; background: #f8fafc; line-height: 1.45; overflow-wrap: anywhere; word-break: break-word; }
  .error-reason-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
  .error-issue-reasons code { min-width: 0; color: #475569; font-size: 11px; font-weight: 600; }
  .error-kind { flex-shrink: 0; padding: 1px 5px; border-radius: 4px; font-size: 8px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  .error-kind-missing { background: #fee2e2; color: #b91c1c; }
  .error-kind-invalid { background: #ffedd5; color: #c2410c; }
  .error-kind-mismatch { background: #fef3c7; color: #a16207; }
  .error-expectation { display: flex; flex-wrap: wrap; gap: 3px 12px; margin-top: 4px; color: #64748b; font-size: 10px; }
  .error-expectation span { display: inline-flex; gap: 5px; min-width: 0; overflow-wrap: anywhere; }
  .error-expectation b { color: #94a3b8; font-size: 8px; letter-spacing: 0.05em; text-transform: uppercase; }
  .error-actions { display: flex; gap: 10px; margin-top: 24px; }
  .error-action { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; padding: 9px 16px; border: 1px solid #cbd5e1; border-radius: 8px; color: #334155; background: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
  .error-action:hover { color: #1d4ed8; border-color: #93c5fd; background: #eff6ff; }
  .error-action-primary { color: #fff; border-color: #2563eb; background: #2563eb; }
  .error-action-primary:hover { color: #fff; border-color: #1d4ed8; background: #1d4ed8; }
  @media (max-width: 650px) {
    .error-issue { padding: 11px 10px 11px 8px; }
    .error-issue-heading { align-items: flex-start; flex-direction: column; gap: 3px; }
    .error-actions { flex-direction: column; }
    .error-action { width: 100%; }
  }
`;
