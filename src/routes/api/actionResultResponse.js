export function actionResultResponse(message, hasActiveCron, status = 200) {
  if (typeof message !== "string" || !message) throw new Error("Action result message missing");
  if (typeof hasActiveCron !== "boolean") throw new Error("Action result hasActiveCron invalid");
  return new Response(JSON.stringify({ message, hasActiveCron }), {
    status,
    headers: { "content-type": "application/json" }
  });
}
