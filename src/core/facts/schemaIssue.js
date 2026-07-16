const SchemaIssueKinds = new Set(["missing", "invalid", "mismatch"]);

export function describeSchemaValue(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(length=${value.length})`;
  if (typeof value === "object") return "object";
  if (typeof value === "string") {
    const clipped = value.length > 32 ? `${value.slice(0, 29)}...` : value;
    return `string(${JSON.stringify(clipped)})`;
  }
  return `${typeof value}(${String(value)})`;
}

export function createSchemaIssue(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Schema issue input must be an object");
  }
  const { artifactKey, path, kind, expected } = input;
  if (typeof artifactKey !== "string" || !artifactKey) throw new Error("Schema issue artifactKey missing");
  if (typeof path !== "string" || !path) throw new Error("Schema issue path missing");
  if (!SchemaIssueKinds.has(kind)) throw new Error("Schema issue kind invalid");
  if (typeof expected !== "string" || !expected) throw new Error("Schema issue expected missing");

  const issue = { artifactKey, path, kind, expected };
  if (Object.hasOwn(input, "actual")) {
    if (typeof input.actual !== "string" || !input.actual) throw new Error("Schema issue actual invalid");
    issue.actual = input.actual;
  }
  return issue;
}

export function assertSchemaIssue(issue) {
  return createSchemaIssue(issue);
}

export function formatSchemaIssue(issue) {
  const normalized = assertSchemaIssue(issue);
  const actualText = normalized.actual ? `; actual ${normalized.actual}` : "";
  return `${normalized.artifactKey}.${normalized.path} ${normalized.kind}; expected ${normalized.expected}${actualText}`;
}

export class SchemaIssueError extends Error {
  constructor(issue) {
    const normalized = assertSchemaIssue(issue);
    super(formatSchemaIssue(normalized));
    this.name = "SchemaIssueError";
    this.issue = normalized;
  }
}

export function throwSchemaIssue(issue) {
  throw new SchemaIssueError(issue);
}

export function readSchemaIssue(error) {
  if (!(error instanceof SchemaIssueError)) throw error;
  return error.issue;
}
