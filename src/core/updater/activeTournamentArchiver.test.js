import { describe, expect, it, vi } from "vitest";
import { archiveRemovedActiveTournaments } from "./activeTournamentArchiver.js";

function tournament(name) {
  return {
    slug: "removed-tournament",
    name,
    league: "TEST",
    overview_page: ["Test/2026"],
    start_date: "2026-01-01",
    end_date: "2026-01-31"
  };
}

describe("archiveRemovedActiveTournaments", () => {
  it("builds the snapshot from read-only CONFIG_ARCHIVE metadata", async () => {
    const values = new Map([
      ["ACTIVE_TOURNAMENTS", { "removed-tournament": tournament("Old active name") }],
      ["CONFIG_ARCHIVE", [tournament("GitHub archive name")]],
      ["CONFIG_TEAMS", {}],
      ["RAW_MATCHES_removed-tournament", []]
    ]);
    const kv = {
      get: vi.fn(async key => values.has(key) ? values.get(key) : null),
      put: vi.fn(async (key, value) => values.set(key, JSON.parse(value))),
      delete: vi.fn(async key => values.delete(key))
    };

    const result = await archiveRemovedActiveTournaments({ "lol-stats-kv": kv }, []);

    expect(result).toEqual({ archived: ["removed-tournament"] });
    expect(values.get("ARCHIVE_removed-tournament").tournament.name).toBe("GitHub archive name");
    expect(values.get("CONFIG_ARCHIVE")).toEqual([tournament("GitHub archive name")]);
    expect(kv.put.mock.calls.map(([key]) => key)).not.toContain("CONFIG_ARCHIVE");
  });
});
