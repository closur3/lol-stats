import { assertSchemaIssue } from "../../core/facts/schemaIssue.js";
import { escapeHtml } from "../../utils/htmlEscape.js";

function groupSchemaIssues(issues) {
  const issuesByArtifact = new Map();
  for (const rawIssue of issues) {
    const issue = assertSchemaIssue(rawIssue);
    if (!issuesByArtifact.has(issue.artifactKey)) issuesByArtifact.set(issue.artifactKey, []);
    issuesByArtifact.get(issue.artifactKey).push(issue);
  }
  return Array.from(issuesByArtifact, ([artifactKey, artifactIssues]) => ({ artifactKey, issues: artifactIssues }));
}

export function renderSchemaIssueCards(issues) {
  if (!Array.isArray(issues)) throw new Error("schema issues must be an array");
  const artifacts = groupSchemaIssues(issues);
  if (artifacts.length === 0) return "";
  return `<ul class="error-issues">${artifacts.map(artifact => {
    const artifactClass = artifact.artifactKey.startsWith("ArchiveSnapshot_")
      ? " is-archive"
      : artifact.artifactKey.startsWith("ActiveHome_") ? " is-active" : "";
    const reasonsHtml = artifact.issues.map(issue => {
      const actualHtml = issue.actual ? `<span><b>Actual</b>${escapeHtml(issue.actual)}</span>` : "";
      return `<li><div class="error-reason-heading"><code>${escapeHtml(issue.path)}</code><span class="error-kind error-kind-${issue.kind}">${escapeHtml(issue.kind)}</span></div><div class="error-expectation"><span><b>Expected</b>${escapeHtml(issue.expected)}</span>${actualHtml}</div></li>`;
    }).join("");
    const issueCountLabel = `${artifact.issues.length} ${artifact.issues.length === 1 ? "issue" : "issues"}`;
    return `<li class="error-issue${artifactClass}"><span class="error-issue-mark" aria-hidden="true"></span><div class="error-issue-content"><div class="error-issue-heading"><code>${escapeHtml(artifact.artifactKey)}</code><span class="error-issue-count">${issueCountLabel}</span></div><ul class="error-issue-reasons">${reasonsHtml}</ul></div></li>`;
  }).join("")}</ul>`;
}
