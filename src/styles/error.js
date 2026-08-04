import activeCSS from "./active.js";
import schemaIssuesCSS from "./schemaIssues.js";

export default `${activeCSS}${schemaIssuesCSS}
  .error-layout { width: 100%; }
  .error-content { width: min(720px, 100%); margin: 0 auto; }
  .error-code { display: inline-flex; align-items: center; min-height: 24px; margin-bottom: 14px; padding: 3px 8px; border: 1px solid #fecaca; border-radius: var(--radius-badge); background: #fef2f2; color: #b91c1c; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; }
  .error-title { max-width: 100%; margin: 0 0 8px; color: #0f172a; font-size: clamp(22px, 4vw, 28px); line-height: 1.25; font-weight: 700; overflow-wrap: anywhere; }
  .error-detail { color: #64748b; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
  .error-actions { display: flex; gap: 10px; margin-top: 24px; }
  .error-action { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; padding: 9px 16px; border: 1px solid #cbd5e1; border-radius: var(--radius-control); color: #334155; background: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
  .error-action:hover { color: #1d4ed8; border-color: #93c5fd; background: #eff6ff; }
  .error-action-primary { color: #fff; border-color: #2563eb; background: #2563eb; }
  .error-action-primary:hover { color: #fff; border-color: #1d4ed8; background: #1d4ed8; }
  @media (max-width: 650px) {
    .error-actions { flex-direction: column; }
    .error-action { width: 100%; }
  }
`;
