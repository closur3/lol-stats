import errorCSS from "../../styles/error.js";
import { escapeHtml } from "../../utils/htmlEscape.js";
import { renderPageShell } from "./page.js";
import { assertSchemaIssue } from "../../core/facts/schemaIssue.js";

function groupSchemaIssues(issues) {
  const issuesByArtifact = new Map();
  for (const rawIssue of issues) {
    const issue = assertSchemaIssue(rawIssue);
    if (!issuesByArtifact.has(issue.artifactKey)) issuesByArtifact.set(issue.artifactKey, []);
    issuesByArtifact.get(issue.artifactKey).push(issue);
  }
  return Array.from(issuesByArtifact, ([artifactKey, artifactIssues]) => ({ artifactKey, issues: artifactIssues }));
}

export function renderDataErrorPage(error, time, sha, page) {
  const message = error instanceof Error ? error.message : String(error);
  const artifacts = Array.isArray(error?.issues) ? groupSchemaIssues(error.issues) : [];
  const issueList = artifacts.length > 0
    ? `<ul class="error-issues">${artifacts.map(artifact => {
      const artifactClass = artifact.artifactKey.startsWith("ArchiveSnapshot_")
        ? " is-archive"
        : artifact.artifactKey.startsWith("ActiveHome_") ? " is-active" : "";
      const reasonsHtml = artifact.issues.map(issue => {
        const actualHtml = issue.actual ? `<span><b>Actual</b>${escapeHtml(issue.actual)}</span>` : "";
        return `<li><div class="error-reason-heading"><code>${escapeHtml(issue.path)}</code><span class="error-kind error-kind-${issue.kind}">${escapeHtml(issue.kind)}</span></div><div class="error-expectation"><span><b>Expected</b>${escapeHtml(issue.expected)}</span>${actualHtml}</div></li>`;
      }).join("");
      const issueCountLabel = `${artifact.issues.length} ${artifact.issues.length === 1 ? "issue" : "issues"}`;
      return `<li class="error-issue${artifactClass}"><span class="error-issue-mark" aria-hidden="true"></span><div class="error-issue-content"><div class="error-issue-heading"><code>${escapeHtml(artifact.artifactKey)}</code><span class="error-issue-count">${issueCountLabel}</span></div><ul class="error-issue-reasons">${reasonsHtml}</ul></div></li>`;
    }).join("")}</ul>`
    : "";
  const body = `<main class="error-layout">
    <div class="error-content">
      <div class="error-code">500 Internal Server Error</div>
      <h2 class="error-title">${escapeHtml(page.dataLabel)} data is not ready</h2>
      <p class="error-detail">${escapeHtml(message)}</p>
      ${issueList}
      <div class="error-actions">
        <a class="error-action error-action-primary" href="/tools">Open Tools</a>
        <a class="error-action" href="${escapeHtml(page.retryHref)}">Retry</a>
      </div>
    </div>
  </main>`;
  return renderPageShell(`${page.dataLabel} Error`, body, page.navMode, time, sha, false, {
    css: errorCSS,
    script: "",
    showModal: false,
    showPageActions: false
  });
}
