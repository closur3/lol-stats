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
      ConfigArchive: [archiveTournament],
      ConfigTeams: {},
      "ActiveHome_archive-tournament": { tournament: archiveTournament },
      "ActiveLog_archive-tournament": [],
      "FandomRevision_archive-tournament": 123,
      "RawMatches_archive-tournament": [],
      "ScheduleMeta_archive-tournament": { todayEarliestTimestamp: 0, todayUnfinished: 0, hasHistoryUnfinished: false }
    });

    const result = await migrateArchiveSnapshotsFromActiveFacts({ "lol-stats-kv": kv }, []);

    expect(result).toEqual({ migrated: ["archive-tournament"] });
    expect(kv.values.get("ArchiveSnapshot_archive-tournament").tournament).toEqual(archiveTournament);
    expect(kv.values.has("ActiveHome_archive-tournament")).toBe(false);
    expect(kv.values.has("ActiveLog_archive-tournament")).toBe(false);
    expect(kv.values.has("FandomRevision_archive-tournament")).toBe(false);
    expect(kv.values.has("RawMatches_archive-tournament")).toBe(false);
    expect(kv.values.has("ScheduleMeta_archive-tournament")).toBe(false);
    expect(kv.values.get("ConfigArchive")).toEqual([archiveTournament]);
  });

  it("skips ConfigArchive entries without active RawMatches", async () => {
    const kv = createKv({
      ConfigArchive: [tournament()],
      ConfigTeams: {}
    });

    await expect(migrateArchiveSnapshotsFromActiveFacts({ "lol-stats-kv": kv }, []))
      .resolves.toEqual({ migrated: [] });
    expect(kv.put).not.toHaveBeenCalled();
    expect(kv.delete).not.toHaveBeenCalled();
  });

  it("fails when ConfigActive and ConfigArchive overlap", async () => {
    const archiveTournament = tournament();
    const kv = createKv({
      ConfigArchive: [archiveTournament],
      ConfigTeams: {},
      "RawMatches_archive-tournament": []
    });

    await expect(migrateArchiveSnapshotsFromActiveFacts({ "lol-stats-kv": kv }, [archiveTournament]))
      .rejects.toThrow("ConfigActive and ConfigArchive overlap: archive-tournament");
    expect(kv.values.has("RawMatches_archive-tournament")).toBe(true);
    expect(kv.values.has("ArchiveSnapshot_archive-tournament")).toBe(false);
  });
});
