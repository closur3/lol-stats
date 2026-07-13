import { describe, expect, it } from "vitest";
import { buildTournamentApplyState } from "./tournamentConfigFingerprint.js";

function tournament(teamMap) {
  return {
    slug: "test",
    name: "Test",
    leagueShort: "TEST",
    overviewPage: ["Test/2026"],
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    teamMap
  };
}

describe("buildTournamentApplyState", () => {
  it("is independent of teamMap insertion order", async () => {
    const left = await buildTournamentApplyState({ active: [tournament({ Beta: "BE", Alpha: "AL" })], archive: [] });
    const right = await buildTournamentApplyState({ active: [tournament({ Alpha: "AL", Beta: "BE" })], archive: [] });

    expect(left).toEqual(right);
    expect(left.configDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("treats Config order as business state", async () => {
    const first = tournament({ Alpha: "AL" });
    const second = { ...tournament({ Beta: "BE" }), slug: "second", name: "Second" };
    const left = await buildTournamentApplyState({ active: [first, second], archive: [] });
    const right = await buildTournamentApplyState({ active: [second, first], archive: [] });

    expect(left.configDigest).not.toBe(right.configDigest);
  });
});
