import errorCSS from "../../styles/error.js";
import { escapeHtml } from "../../utils/htmlEscape.js";
import { renderPageShell } from "./page.js";

export function renderArchiveErrorPage(error, time, sha) {
  const message = error instanceof Error ? error.message : String(error);
  const issues = Array.isArray(error?.issues) ? error.issues : [];
  const issueList = issues.length > 0
    ? `<ul class="error-issues">${issues.map(issue => `<li class="error-issue"><span class="error-issue-mark" aria-hidden="true"></span><code>${escapeHtml(issue.slug)}</code><span>${escapeHtml(issue.reason)}</span></li>`).join("")}</ul>`
    : "";
  const body = `<main class="error-layout">
    <div class="error-content">
      <div class="error-code">500 Internal Server Error</div>
      <h2 class="error-title">Archive data is not ready</h2>
      <p class="error-detail">${escapeHtml(message)}</p>
      ${issueList}
      <div class="error-actions">
        <a class="error-action error-action-primary" href="/tools">Open Tools</a>
        <a class="error-action" href="/archive">Retry</a>
      </div>
    </div>
  </main>`;
  return renderPageShell("Archive Error", body, "archive", time, sha, false, {
    css: errorCSS,
    script: "",
    showModal: false,
    showPageActions: false
  });
}
