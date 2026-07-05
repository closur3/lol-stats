import { afterEach, describe, expect, it, vi } from "vitest";
import { runScheduleApply } from "./scheduleApplyRunner.js";

const env = {
  CLOUDFLARE_API_TOKEN: "token",
  CLOUDFLARE_ACCOUNT_ID: "account"
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("runScheduleApply", () => {
  it("applies the desired schedules to Cloudflare", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(runScheduleApply(env, ["0 */2 * * *"], "TEST")).resolves.toBe("applied");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual([{ cron: "0 */2 * * *" }]);
  });

  it("skips Cloudflare without reporting the schedules as applied", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(runScheduleApply(env, ["0 */2 * * *"], "TEST", { applySchedules: false })).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records a best-effort failure without reporting success", async () => {
    const warnings = [];
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "failed"
    }));

    await expect(runScheduleApply(env, ["0 */2 * * *"], "TEST", {
      applySchedules: "best-effort",
      scheduleWarnings: warnings
    })).resolves.toBe("failed");
    expect(warnings).toEqual(["TEST: Cloudflare schedules HTTP 500: failed"]);
  });

  it("fails fast when Cloudflare rejects a required apply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "failed"
    }));

    await expect(runScheduleApply(env, ["0 */2 * * *"], "TEST"))
      .rejects.toThrow("Cloudflare schedules HTTP 500: failed");
  });
});
