import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "../../api/fandom/auth.js";
import { fetchRawMatchesForCandidates } from "./matchDataFetcher.js";
import { runActiveUpdate } from "./activeUpdateRunner.js";

vi.mock("../../api/fandom/auth.js", () => ({
  login: vi.fn()
}));

vi.mock("../../api/fandomClient.js", () => ({
  FandomClient: class {}
}));

vi.mock("./matchDataFetcher.js", () => ({
  fetchRawMatchesForCandidates: vi.fn()
}));

describe("runActiveUpdate", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    vi.mocked(fetchRawMatchesForCandidates).mockReset();
    vi.mocked(login).mockResolvedValue({ username: "test" });
  });

  it("fails a force update when any requested Fandom fetch fails", async () => {
    const tournament = {
      slug: "updated-tournament",
      name: "Updated Tournament",
      leagueShort: "TEST",
      overviewPage: ["Updated/2026"],
      teamMap: { Team: "T" },
      startDate: "2026-01-01",
      endDate: "2026-01-31"
    };
    vi.mocked(fetchRawMatchesForCandidates).mockResolvedValue([{
      status: "rejected",
      slug: tournament.slug,
      error: new Error("network")
    }]);

    await expect(runActiveUpdate(
      {},
      [tournament],
      { [tournament.slug]: [] },
      true,
      new Set([tournament.slug]),
      { forceWrite: true, revidChanges: {}, pendingRevisionWrites: {} }
    )).rejects.toThrow("Force Fandom fetch failed: updated-tournament");
  });
});
