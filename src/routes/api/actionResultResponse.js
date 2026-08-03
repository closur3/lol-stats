import { assertCronInfo } from "../../core/scheduler/cronInfo.js";

export function actionResultResponse(message, cronInfo, status = 200) {
  if (typeof message !== "string" || !message) throw new Error("Action result message missing");
  const normalizedCronInfo = assertCronInfo(cronInfo);
  return new Response(JSON.stringify({ message, cronInfo: normalizedCronInfo }), {
    status,
    headers: { "content-type": "application/json" }
  });
}
