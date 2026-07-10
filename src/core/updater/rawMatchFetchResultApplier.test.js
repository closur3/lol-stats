import { describe, expect, it } from "vitest";
import { applyRawMatchFetchOutcomes } from "./rawMatchFetchResultApplier.js";

const tournament = { slug: "new-tournament", name: "New Tournament", leagueShort: "NEW" };
const rawMatch = {
  Team1: "Alpha",
  Team2: "Beta",
  Winner: "",
  Team1Score: "",
  Team2Score: "",
  FF: "",
  IsNullified: "0",
  DateTimeUTC: "2026-07-10 12:00:00",
  OverviewPage: "New Tournament/2026",
  BestOf: "3",
  Tab: "",
  MatchId: "new-match"
};

describe("applyRawMatchFetchOutcomes", () => {
  it("initializes a missing RawMatches fact from a successful Fandom fetch", () => {
    const rawMatchesBySlug = { "new-tournament": null };

    const update = applyRawMatchFetchOutcomes([
      { status: "fulfilled", slug: "new-tournament", rawMatches: [rawMatch] }
    ], rawMatchesBySlug, false, [tournament]);

    expect(rawMatchesBySlug["new-tournament"]).toEqual([rawMatch]);
    expect(update.syncItems).toEqual([{
      slug: "new-tournament",
      displayName: "NEW",
      added: 1,
      updated: 0,
      isForce: false
    }]);
    expect(update.skipItems).toEqual([]);
  });

  it("still rejects a malformed existing RawMatches fact", () => {
    expect(() => applyRawMatchFetchOutcomes([
      { status: "fulfilled", slug: "new-tournament", rawMatches: [rawMatch] }
    ], { "new-tournament": {} }, false, [tournament])).toThrow("RawMatches invalid in active update scope: new-tournament");
  });
});
