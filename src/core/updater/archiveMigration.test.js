import { describe, expect, it, vi } from "vitest";
import { migrateArchiveSnapshotsFromActiveFacts } from "./archiveMigration.js";

function tournament(slug = "archive-tournament") {
  return {
    slug,
    name: "Archive Tournament",
    league: "TEST",
    overview_page: ["Test/2026"],
    start_date: "2026-01-01",
    end_date: "2026-01-31"
  };
}

function createKv(initialValues) {
  const values = new Map(Object.entries(initialValues));
  return {
    values,
    get: vi.fn(async key => {
      const value = values.get(key);
      return value === undefined ? null : JSON.parse(JSON.stringify(value));
    }),
    put: vi.fn(async (key, value) => {
      values.set(key, JSON.parse(value));
    }),
    delete: vi.fn(async key => {
      values.delete(key);
    })
  };
}

describe("migrateArchiveSnapshotsFromActiveFacts", () => {
  it("builds ARCHIVE from existing RAW_MATCHES and deletes active runtime facts", async () => {
    const archiveTournament = tournament();
    const kv = createKv({
      CONFIG_ARCHIVE: [archiveTournament],
      CONFIG_TEAMS: {},
      "HOME_archive-tournament": { tournament: archiveTournament },
      "LOG_archive-tournament": [],
      "REV_archive-tournament": 123,
      "RAW_MATCHES_archive-tournament": [],
      "SCHEDULE_META_archive-tournament": { todayEarliestTimestamp: 0, todayUnfinished: 0, hasHistoryUnfinished: false }
    });

    const result = await migrateArchiveSnapshotsFromActiveFacts({ "lol-stats-kv": kv }, []);

    expect(result).toEqual({ migrated: ["archive-tournament"] });
    expect(kv.values.get("ARCHIVE_archive-tournament").tournament).toEqual(archiveTournament);
    expect(kv.values.has("HOME_archive-tournament")).toBe(false);
    expect(kv.values.has("LOG_archive-tournament")).toBe(false);
    expect(kv.values.has("REV_archive-tournament")).toBe(false);
    expect(kv.values.has("RAW_MATCHES_archive-tournament")).toBe(false);
    expect(kv.values.has("SCHEDULE_META_archive-tournament")).toBe(false);
    expect(kv.values.get("CONFIG_ARCHIVE")).toEqual([archiveTournament]);
  });

  it("skips CONFIG_ARCHIVE entries without active RAW_MATCHES", async () => {
    const kv = createKv({
      CONFIG_ARCHIVE: [tournament()],
      CONFIG_TEAMS: {}
    });

    await expect(migrateArchiveSnapshotsFromActiveFacts({ "lol-stats-kv": kv }, []))
      .resolves.toEqual({ migrated: [] });
    expect(kv.put).not.toHaveBeenCalled();
    expect(kv.delete).not.toHaveBeenCalled();
  });

  it("fails when CONFIG_ACTIVE and CONFIG_ARCHIVE overlap", async () => {
    const archiveTournament = tournament();
    const kv = createKv({
      CONFIG_ARCHIVE: [archiveTournament],
      CONFIG_TEAMS: {},
      "RAW_MATCHES_archive-tournament": []
    });

    await expect(migrateArchiveSnapshotsFromActiveFacts({ "lol-stats-kv": kv }, [archiveTournament]))
      .rejects.toThrow("CONFIG_ACTIVE and CONFIG_ARCHIVE overlap: archive-tournament");
    expect(kv.values.has("RAW_MATCHES_archive-tournament")).toBe(true);
    expect(kv.values.has("ARCHIVE_archive-tournament")).toBe(false);
  });
});
