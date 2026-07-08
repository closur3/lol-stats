import { describe, expect, it, vi } from "vitest";
import { readArchiveConfig } from "./archiveConfigReader.js";

function createEnv(value) {
  return {
    "lol-stats-kv": {
      get: vi.fn().mockResolvedValue(value)
    }
  };
}

describe("readArchiveConfig", () => {
  it("reads ConfigArchive without changing GitHub-defined order", async () => {
    const config = [
      {
        slug: "z-tournament",
        name: "Z Tournament",
        leagueShort: "Z",
        overviewPage: ["Z/2026"],
        teamMap: { "Z Team": "Z" },
        startDate: "2026-06-01",
        endDate: "2026-06-30"
      },
      {
        slug: "a-tournament",
        name: "A Tournament",
        leagueShort: "",
        overviewPage: ["A/2026"],
        teamMap: { "A Team": "A" },
        startDate: "2026-01-01",
        endDate: "2026-01-31"
      }
    ];

    const result = await readArchiveConfig(createEnv(config));

    expect(result.map(tournament => tournament.slug)).toEqual(["z-tournament", "a-tournament"]);
  });

  it("fails when ConfigArchive is missing", async () => {
    await expect(readArchiveConfig(createEnv(null))).rejects.toThrow("ConfigArchive missing");
  });

  it("rejects duplicate slugs", async () => {
    const tournament = {
      slug: "duplicate",
      name: "Duplicate",
      leagueShort: "DUP",
      overviewPage: ["Duplicate/2026"],
      teamMap: { "Duplicate Team": "DUP" },
      startDate: "2026-01-01",
      endDate: "2026-01-31"
    };

    await expect(readArchiveConfig(createEnv([tournament, tournament])))
      .rejects.toThrow("Duplicate ConfigArchive slug: duplicate");
  });

  it("rejects an invalid overview page instead of filtering it", async () => {
    const tournament = {
      slug: "invalid-overview",
      name: "Invalid Overview",
      leagueShort: "TEST",
      overviewPage: ["Valid/2026", ""],
      teamMap: { "Test Team": "TEST" },
      startDate: "2026-01-01",
      endDate: "2026-01-31"
    };

    await expect(readArchiveConfig(createEnv([tournament])))
      .rejects.toThrow("Invalid ConfigArchive overviewPage: invalid-overview");
  });

  it("rejects a missing leagueShort", async () => {
    const tournament = {
      slug: "missing-league-short",
      name: "Missing League Short",
      overviewPage: ["Missing/2026"],
      teamMap: { "Test Team": "TEST" },
      startDate: "2026-01-01",
      endDate: "2026-01-31"
    };

    await expect(readArchiveConfig(createEnv([tournament])))
      .rejects.toThrow("Invalid ConfigArchive tournament: missing-league-short");
  });
});
