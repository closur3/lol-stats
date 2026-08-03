const Actions = new Set(["SYNC", "SKIP", "BREAKER", "API_ERROR"]);
const UpdateReasons = new Set(["added", "updated", "force", "revision"]);

function assertExactFields(value, expectedFields, label) {
  const fields = Object.keys(value);
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(value, field))) {
    throw new Error(`${label} fields must match the schema`);
  }
}

function readText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function readCount(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`);
  return value;
}

function readTrigger(value, label) {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object or null`);
  assertExactFields(value, ["title", "revid"], label);
  const revid = readCount(value.revid, `${label}.revid`);
  if (revid === 0) throw new Error(`${label}.revid must be positive`);
  return { title: readText(value.title, `${label}.title`), revid };
}

export function normalizeActiveLogEntry(value, label = "ActiveLog entry") {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const action = readText(value.action, `${label}.action`);
  if (!Actions.has(action)) throw new Error(`${label}.action is invalid`);
  const loggedAt = readText(value.loggedAt, `${label}.loggedAt`);
  if (action === "SYNC" || action === "SKIP") {
    assertExactFields(value, ["loggedAt", "action", "added", "updated", "trigger", "updateReason"], label);
    const updateReason = readText(value.updateReason, `${label}.updateReason`);
    if (!UpdateReasons.has(updateReason)) throw new Error(`${label}.updateReason is invalid`);
    return {
      loggedAt,
      action,
      added: readCount(value.added, `${label}.added`),
      updated: readCount(value.updated, `${label}.updated`),
      trigger: readTrigger(value.trigger, `${label}.trigger`),
      updateReason
    };
  }

  if (action === "BREAKER") {
    assertExactFields(value, ["loggedAt", "action", "dropInfo"], label);
    return { loggedAt, action, dropInfo: readText(value.dropInfo, `${label}.dropInfo`) };
  }

  assertExactFields(value, ["loggedAt", "action"], label);
  return { loggedAt, action };
}

export function normalizeActiveLogEntries(value, label = "ActiveLog") {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) => normalizeActiveLogEntry(entry, `${label}[${index}]`));
}
