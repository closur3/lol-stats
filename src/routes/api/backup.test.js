import { describe, expect, it, vi } from "vitest";
import { handleBackup } from "./backup.js";

function tournament(slug, name) {
  return {
    slug,
    name,
    leagueShort: "LCK",
    overviewPage: [name],
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    teamMap: { Team: "T" }
  };
}

function snapshot(slug, name, extra = {}) {
  return {
    tournament: {
      slug,
      name,
      leagueShort: "LCK",
      overviewPage: [name],
      startDate: "2026-01-01",
      endDate: "2026-01-02"
    },
    stats: {},
    timeGrid: {},
    ...extra
  };
}

function createRequest(url) {
  return {
    url,
    headers: {
      get(name) {
        return name === "Authorization" ? "Bearer secret" : null;
      }
    }
  };
}

function createEnv(values) {
  return {
    ADMIN_SECRET: "secret",
    "lol-stats-kv": {
      get: vi.fn(async key => values[key])
    }
  };
}

describe("handleBackup", () => {
  it("exports active snapshots by default without reading archive config", async () => {
    const env = createEnv({
      ConfigActive: [tournament("active-slug", "Active")],
      "ActiveHome_active-slug": snapshot("active-slug", "Active", { scheduleMap: {} })
    });

    const response = await handleBackup(createRequest("https://example.test/backup"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      home: {
        "active-slug": snapshot("active-slug", "Active", { scheduleMap: {} })
      }
    });
    expect(env["lol-stats-kv"].get).not.toHaveBeenCalledWith("ConfigArchive", { type: "json" });
  });

  it("exports archive snapshots when includeArchive is true", async () => {
    const env = createEnv({
      ConfigActive: [tournament("active-slug", "Active")],
      ConfigArchive: [tournament("archive-slug", "Archive")],
      "ActiveHome_active-slug": snapshot("active-slug", "Active", { scheduleMap: {} }),
      "ArchiveSnapshot_archive-slug": snapshot("archive-slug", "Archive")
    });

    const response = await handleBackup(createRequest("https://example.test/backup?includeArchive=true"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      home: {
        "active-slug": snapshot("active-slug", "Active", { scheduleMap: {} })
      },
      archive: {
        "archive-slug": snapshot("archive-slug", "Archive")
      }
    });
  });

  it("fails when a configured ActiveHome snapshot is missing", async () => {
    const env = createEnv({
      ConfigActive: [tournament("active-slug", "Active")]
    });

    const response = await handleBackup(createRequest("https://example.test/backup"), env);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Backup Error: ActiveHome missing: active-slug");
  });

  it("fails when a configured ArchiveSnapshot is missing from a full backup", async () => {
    const env = createEnv({
      ConfigActive: [tournament("active-slug", "Active")],
      ConfigArchive: [tournament("archive-slug", "Archive")],
      "ActiveHome_active-slug": snapshot("active-slug", "Active", { scheduleMap: {} })
    });

    const response = await handleBackup(createRequest("https://example.test/backup?includeArchive=true"), env);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Backup Error: ArchiveSnapshot missing: archive-slug");
  });
});
