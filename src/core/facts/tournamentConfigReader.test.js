import { describe, expect, it, vi } from "vitest";
import { readActiveConfig, readArchiveConfig } from "./tournamentConfigReader.js";

function createEnv(value) {
  return {
    "lol-stats-kv": {
      get: vi.fn().mockResolvedValue(value)
    }
  };
}

function createTournament(slug, name) {
  return {
    slug,
    name,
    leagueShort: "TEST",
    overviewPage: [`${name}/2026`],
    teamMap: { [`${name} Team`]: name },
    startDate: "2026-01-01",
    endDate: "2026-01-31"
  };
}

describe("tournamentConfigReader", () => {
  it("reads ConfigArchive without changing GitHub-defined order", async () => {
    const config = [createTournament("z-tournament", "Z Tournament"), createTournament("a-tournament", "A Tournament")];

    const result = await readArchiveConfig(createEnv(config));

    expect(result.map(tournament => tournament.slug)).toEqual(["z-tournament", "a-tournament"]);
  });

  it("uses the same strict schema for ConfigActive", async () => {
    const tournament = createTournament("active-tournament", "Active Tournament");

    await expect(readActiveConfig(createEnv([{ ...tournament, overviewPage: ["Valid/2026", ""] }])))
      .rejects.toThrow("Invalid ConfigActive overviewPage: active-tournament");
  });

  it("fails when ConfigArchive is missing", async () => {
    await expect(readArchiveConfig(createEnv(null))).rejects.toThrow("ConfigArchive missing");
  });

  it("rejects duplicate slugs", async () => {
    const tournament = createTournament("duplicate", "Duplicate");

    await expect(readArchiveConfig(createEnv([tournament, tournament])))
      .rejects.toThrow("Duplicate ConfigArchive slug: duplicate");
  });

  it("rejects missing required tournament fields", async () => {
    const tournament = createTournament("missing-league-short", "Missing League Short");
    delete tournament.leagueShort;

    await expect(readArchiveConfig(createEnv([tournament])))
      .rejects.toThrow("Invalid ConfigArchive tournament: missing-league-short");
  });
});
