import { commitActiveLogWrites } from "./logPersistence.js";

export async function rejectActiveUpdate(env, plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan) || plan.accepted !== false) {
    throw new Error("Rejected active update plan required");
  }
  const fields = Object.keys(plan);
  const expectedFields = ["accepted", "failureMessage", "activeLogWrites"];
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(plan, field))) {
    throw new Error("Rejected active update plan fields invalid");
  }
  if (typeof plan.failureMessage !== "string" || !plan.failureMessage) {
    throw new Error("Active update rejection message missing");
  }
  await commitActiveLogWrites(env, plan.activeLogWrites);
  throw new Error(plan.failureMessage);
}
