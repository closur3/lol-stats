import { describe, expect, it, vi } from "vitest";
import { assertTournamentRuntimeMatchesConfig } from "./tournamentRuntimeValidator.js";

function tournament(name = "Tournament") {
  return {
    slug: "test-2026",
    name,
    leagueShort: "TEST",
    overviewPage: ["Test/2026"],
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    teamMap: { Team: "T" }
  };
}

function snapshot(configTournament) {
  const storedTournament = { ...configTournament };
  delete storedTournament.teamMap;
  return {
    tournament: storedTournament,
    stats: {},
    timeGrid: {},
    scheduleMap: {}
  };
}

function createEnv(values) {
  return {
    "lol-stats-kv": {
      get: vi.fn(async key => values[key] ?? null)
    }
  };
}

describe("assertTournamentRuntimeMatchesConfig", () => {
  it("accepts complete Active runtime aligned with TournamentConfig", async () => {
    const configTournament = tournament();
    const env = createEnv({
      "RawMatches_test-2026": [],
      "ScheduleMeta_test-2026": { todayEarliestTimestamp: 0, todayUnfinished: 0, hasHistoryUnfinished: false },
      "ActiveHome_test-2026": snapshot(configTournament)
    });

    await expect(assertTournamentRuntimeMatchesConfig(env, { active: [configTournament], archive: [] }))
      .resolves.toBeUndefined();
  });

  it("rejects a snapshot built from different tournament metadata", async () => {
    const configTournament = tournament("Current Name");
    const env = createEnv({
      "RawMatches_test-2026": [],
      "ScheduleMeta_test-2026": { todayEarliestTimestamp: 0, todayUnfinished: 0, hasHistoryUnfinished: false },
      "ActiveHome_test-2026": snapshot(tournament("Old Name"))
    });

    await expect(assertTournamentRuntimeMatchesConfig(env, { active: [configTournament], archive: [] }))
      .rejects.toThrow("ActiveHome tournament does not match TournamentConfig: test-2026");
  });
});
