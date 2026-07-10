import { describe, expect, it } from "vitest";
import { parseTournamentMatches } from "./matchParser.js";

const resolveTeamName = (name) => name;
const tournamentArgs = [resolveTeamName, "2026-07-10", "test", "TST", 0, {}];

describe("parseTournamentMatches", () => {
  it("keeps forfeits as finished results without counting them as full-length", () => {
    const { parsedMatches, stats } = parseTournamentMatches([{
      Team1: "Alpha", Team2: "Beta", Winner: "2", Team1Score: "2", Team2Score: "3",
      FF: "1", IsNullified: "0", DateTimeUTC: "2026-07-09 12:00:00", BestOf: "5", Tab: "Round", MatchId: "forfeit"
    }], ...tournamentArgs);

    expect(parsedMatches).toHaveLength(1);
    expect(parsedMatches[0]).toMatchObject({ isForfeit: true, isFullLength: false });
    expect(parsedMatches[0]).not.toHaveProperty("forfeitSide");
    expect(stats.Beta.seriesWinCount).toBe(1);
  });

  it("excludes a nullified result from every derived output", () => {
    const { parsedMatches, stats, scheduleMeta } = parseTournamentMatches([{
      Team1: "Alpha", Team2: "Beta", Winner: "1", Team1Score: "3", Team2Score: "0",
      FF: "", IsNullified: "1", DateTimeUTC: "2026-07-10 12:00:00", BestOf: "5", Tab: "Round", MatchId: "nullified"
    }], ...tournamentArgs);

    expect(parsedMatches).toEqual([]);
    expect(stats).toEqual({});
    expect(scheduleMeta).toEqual({ todayEarliestTimestamp: 0, todayUnfinished: 0, hasHistoryUnfinished: false });
  });
});
