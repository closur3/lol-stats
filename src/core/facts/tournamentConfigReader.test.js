import { describe, expect, it, vi } from "vitest";
import { readTournamentConfig } from "./tournamentConfigReader.js";

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
  it("reads both lists without changing GitHub-defined order", async () => {
    const archive = [createTournament("z-tournament", "Z Tournament"), createTournament("a-tournament", "A Tournament")];

    const result = await readTournamentConfig(createEnv({ active: [], archive }));

    expect(result.archive.map(tournament => tournament.slug)).toEqual(["z-tournament", "a-tournament"]);
  });

  it("uses the same strict schema for active", async () => {
    const tournament = createTournament("active-tournament", "Active Tournament");

    await expect(readTournamentConfig(createEnv({ active: [{ ...tournament, overviewPage: ["Valid/2026", ""] }], archive: [] })))
      .rejects.toThrow("Invalid TournamentConfig.active overviewPage: active-tournament");
  });

  it("fails when TournamentConfig is missing", async () => {
    await expect(readTournamentConfig(createEnv(null))).rejects.toThrow("TournamentConfig missing");
  });

  it("rejects duplicate slugs", async () => {
    const tournament = createTournament("duplicate", "Duplicate");

    await expect(readTournamentConfig(createEnv({ active: [], archive: [tournament, tournament] })))
      .rejects.toThrow("Duplicate TournamentConfig.archive slug: duplicate");
  });

  it("rejects missing required tournament fields", async () => {
    const tournament = createTournament("missing-league-short", "Missing League Short");
    delete tournament.leagueShort;

    await expect(readTournamentConfig(createEnv({ active: [], archive: [tournament] })))
      .rejects.toThrow("TournamentConfig.archive tournament fields must match the schema");
  });

  it("rejects active/archive overlap", async () => {
    const tournament = createTournament("overlap", "Overlap");

    await expect(readTournamentConfig(createEnv({ active: [tournament], archive: [tournament] })))
      .rejects.toThrow("TournamentConfig active/archive overlap: overlap");
  });

  it("rejects extra tournament fields", async () => {
    const tournament = { ...createTournament("extra", "Extra"), legacyLeague: "TEST" };

    await expect(readTournamentConfig(createEnv({ active: [tournament], archive: [] })))
      .rejects.toThrow("TournamentConfig.active tournament fields must match the schema");
  });

  it("rejects overviewPage identity conflicts across groups", async () => {
    const active = createTournament("active", "Shared");
    const archive = createTournament("archive", "Shared");

    await expect(readTournamentConfig(createEnv({ active: [active], archive: [archive] })))
      .rejects.toThrow("TournamentConfig overviewPage identity conflict: Shared/2026");
  });

  it("rejects impossible calendar dates", async () => {
    const tournament = { ...createTournament("bad-date", "Bad Date"), startDate: "2026-02-30" };

    await expect(readTournamentConfig(createEnv({ active: [tournament], archive: [] })))
      .rejects.toThrow("Invalid TournamentConfig.active date range: bad-date");
  });
});
