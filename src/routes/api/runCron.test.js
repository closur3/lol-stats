import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../core/cron/orchestrator.js", () => ({
  runCron: vi.fn()
}));

import { runCron } from "../../core/cron/orchestrator.js";
import { baselineCron } from "../../core/scheduler/cronBuckets.js";
import { handleRunCron } from "./runCron.js";

const env = { ADMIN_SECRET: "secret" };

function createRequest(method, authorization = null) {
  return {
    method,
    headers: {
      get: (name) => name === "Authorization" ? authorization : null
    }
  };
}

beforeEach(() => {
  vi.mocked(runCron).mockReset();
});

describe("handleRunCron", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await handleRunCron(createRequest("POST"), env);

    expect(response.status).toBe(401);
    expect(runCron).not.toHaveBeenCalled();
  });

  it("runs the baseline cron through the normal orchestrator", async () => {
    vi.mocked(runCron).mockResolvedValue(undefined);
    const request = createRequest("POST", "Bearer secret");

    const response = await handleRunCron(request, env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(runCron).toHaveBeenCalledWith(env, expect.objectContaining({ cron: baselineCron }));
    expect(runCron.mock.calls[0][1].scheduledTime).toEqual(expect.any(Number));
  });
});
