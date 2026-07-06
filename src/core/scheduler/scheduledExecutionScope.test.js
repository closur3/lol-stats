import { describe, expect, it } from "vitest";
import { resolveScheduledExecutionScope } from "./scheduledExecutionScope.js";

function createEnv(state) {
  return {
    "lol-stats-kv": {
      get: async () => state
    }
  };
}

const scheduledTime = Date.parse("2026-07-06T04:00:00Z");

describe("resolveScheduledExecutionScope", () => {
  it("runs all tournaments when the daily state is missing", async () => {
    await expect(resolveScheduledExecutionScope(createEnv(null), scheduledTime, "0 */2 * * *"))
      .resolves.toEqual({ type: "all" });
  });

  it("runs all tournaments when the event is not an active bucket cron", async () => {
    const state = {
      date: "2026-07-06",
      slugStates: {
        lck: { phase: "play", playStartHour: 10, playEndHour: 14 }
      }
    };

    await expect(resolveScheduledExecutionScope(createEnv(state), scheduledTime, "0 */2 * * *"))
      .resolves.toEqual({ type: "all" });
  });

  it("limits an active bucket run to slugs inside their play window", async () => {
    const state = {
      date: "2026-07-06",
      slugStates: {
        lck: { phase: "play", playStartHour: 10, playEndHour: 14 },
        lpl: { phase: "idle", playStartHour: null, playEndHour: null }
      }
    };

    const result = await resolveScheduledExecutionScope(
      createEnv(state),
      scheduledTime,
      "2-58/2 2-6 * * mon"
    );

    expect(result.type).toBe("scoped");
    expect([...result.slugs]).toEqual(["lck"]);
  });
});
