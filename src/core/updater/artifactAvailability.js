export function throwIfArtifactsUnavailable(artifactName, issues) {
  if (typeof artifactName !== "string" || artifactName.length === 0) {
    throw new Error("artifactName must be a non-empty string");
  }
  if (!Array.isArray(issues)) throw new Error("issues must be an array");
  if (issues.length === 0) return;
  issues.forEach(issue => {
    if (!issue || typeof issue !== "object" || !issue.slug || !issue.reason) {
      throw new Error("Unavailable artifact issue is invalid");
    }
  });
  const error = new Error(`${issues.length} ${artifactName} unavailable`);
  error.issues = issues;
  throw error;
}
