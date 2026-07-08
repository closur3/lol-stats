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
        league: "Z",
        overview_page: ["Z/2026"],
        teamMap: { "Z Team": "Z" },
        start_date: "2026-06-01",
        end_date: "2026-06-30"
      },
      {
        slug: "a-tournament",
        name: "A Tournament",
        league: "A",
        overview_page: ["A/2026"],
        teamMap: { "A Team": "A" },
        start_date: "2026-01-01",
        end_date: "2026-01-31"
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
      league: "DUP",
      overview_page: ["Duplicate/2026"],
      teamMap: { "Duplicate Team": "DUP" },
      start_date: "2026-01-01",
      end_date: "2026-01-31"
    };

    await expect(readArchiveConfig(createEnv([tournament, tournament])))
      .rejects.toThrow("Duplicate ConfigArchive slug: duplicate");
  });
});
