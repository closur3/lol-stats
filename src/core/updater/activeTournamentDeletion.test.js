import { describe, expect, it, vi } from "vitest";
import { IDLE_SWEEP_CRON } from "../scheduler/cronBuckets.js";
import { deleteActiveRuntimeState } from "./activeTournamentDeletion.js";

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

describe("deleteActiveRuntimeState", () => {
  it("persists slug removal when the desired cron list is unchanged", async () => {
    const slug = "league-2026";
    const kv = createKv({
      ConfigActive: [{ slug }],
      ConfigArchive: [{ slug: "archive-2026" }],
      ArchiveSnapshot_archive_2026: { slug: "archive-2026" },
      ScheduleState: {
        date: "2026-07-05",
        slugStates: {
          [slug]: {
            phase: "idle",
            playStartHour: null,
            playEndHour: null
          }
        },
        schedules: [IDLE_SWEEP_CRON]
      }
    });
    const env = { "lol-stats-kv": kv };

    await expect(deleteActiveRuntimeState(env, slug, {
      scheduleOptions: { applySchedules: false }
    })).resolves.toEqual({ deletedSlug: slug });

    expect(kv.values.get("ScheduleState").slugStates).toEqual({});
    expect(kv.values.get("ScheduleState").schedules).toEqual([IDLE_SWEEP_CRON]);
    expect(kv.values.get("ConfigActive")).toEqual([{ slug }]);
    expect(kv.values.get("ConfigArchive")).toEqual([{ slug: "archive-2026" }]);
    expect(kv.values.get("ArchiveSnapshot_archive_2026")).toEqual({ slug: "archive-2026" });
  });
});
