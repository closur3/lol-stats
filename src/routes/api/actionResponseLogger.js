function normalizeResponseDetail(text) {
  return text.replace(/\s+/g, " ").trim();
}

export async function logActionResponse(action, response) {
  if (typeof action !== "string" || action.length === 0) throw new Error("Action log name missing");
  if (!(response instanceof Response)) throw new Error("Action log response missing");

  const detail = normalizeResponseDetail(await response.clone().text());
  const message = `[TOOLS:${action}] status=${response.status}${detail ? ` result=${detail}` : ""}`;
  if (response.status >= 400) console.error(message);
  else if (response.status >= 300 || response.status === 207) console.warn(message);
  else console.log(message);
  return response;
}
