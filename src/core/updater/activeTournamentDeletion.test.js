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
  it("persists league removal when the desired cron list is unchanged", async () => {
    const slug = "league-2026";
    const kv = createKv({
      ACTIVE_TOURNAMENTS: {
        [slug]: {
          slug,
          name: "League 2026",
          league: "LEAGUE",
          overview_page: ["League/2026"],
          start_date: "2026-01-01",
          end_date: "2026-12-31"
        }
      },
      SCHEDULE_DAY: {
        date: "2026-07-05",
        leagues: {
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

    expect(kv.values.get("SCHEDULE_DAY").leagues).toEqual({});
    expect(kv.values.get("SCHEDULE_DAY").schedules).toEqual([IDLE_SWEEP_CRON]);
    expect(kv.values.get("ACTIVE_TOURNAMENTS")).toEqual({});
  });
});
