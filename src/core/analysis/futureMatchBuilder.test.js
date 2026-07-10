import { describe, expect, it } from "vitest";
import { buildScheduleMap } from "./futureMatchBuilder.js";

describe("buildScheduleMap", () => {
  it("keeps the complete future schedule for later render-time pruning", () => {
    const allFutureMatches = {
      "2026-07-10": [{ tournamentIndex: 1, time: "12:00", slug: "later" }, { tournamentIndex: 0, time: "14:00", slug: "first" }],
      "2026-08-01": [{ tournamentIndex: 0, time: "10:00", slug: "future" }]
    };

    const scheduleMap = buildScheduleMap(allFutureMatches);

    expect(Object.keys(scheduleMap)).toEqual(["2026-07-10", "2026-08-01"]);
    expect(scheduleMap["2026-07-10"].map(match => match.slug)).toEqual(["first", "later"]);
    expect(allFutureMatches["2026-07-10"].map(match => match.slug)).toEqual(["later", "first"]);
  });
});
