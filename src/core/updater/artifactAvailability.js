import { assertSchemaIssue } from "../facts/schemaIssue.js";

export function throwIfArtifactsUnavailable(artifactName, issues) {
  if (typeof artifactName !== "string" || artifactName.length === 0) {
    throw new Error("artifactName must be a non-empty string");
  }
  if (!Array.isArray(issues)) throw new Error("issues must be an array");
  if (issues.length === 0) return;
  const normalizedIssues = issues.map(assertSchemaIssue);
  const artifactCount = new Set(normalizedIssues.map(issue => issue.artifactKey)).size;
  const error = new Error(`${artifactCount} ${artifactName} unavailable`);
  error.issues = normalizedIssues;
  throw error;
}
