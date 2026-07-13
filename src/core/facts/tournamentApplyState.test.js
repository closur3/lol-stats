import { describe, expect, it, vi } from "vitest";
import { readExistingTournamentApplyState, writeTournamentApplyState } from "./tournamentApplyState.js";

function envWith(value) {
  return {
    "lol-stats-kv": {
      get: vi.fn().mockResolvedValue(value),
      put: vi.fn().mockResolvedValue(undefined)
    }
  };
}

describe("TournamentApplyState", () => {
  it("reports a missing checkpoint to the baseline resolver", async () => {
    await expect(readExistingTournamentApplyState(envWith(null))).resolves.toBeNull();
  });

  it("writes only the strict checkpoint schema", async () => {
    const env = envWith(null);
    const state = { configDigest: "a".repeat(64), activeFingerprints: { active: "b".repeat(64) } };

    await writeTournamentApplyState(env, state);

    expect(env["lol-stats-kv"].put).toHaveBeenCalledWith("TournamentApplyState", JSON.stringify(state));
  });

  it("rejects legacy or extra fields", async () => {
    await expect(readExistingTournamentApplyState(envWith({
      configDigest: "a".repeat(64),
      activeFingerprints: {},
      activeSlugs: []
    }))).rejects.toThrow("TournamentApplyState fields must be configDigest and activeFingerprints");
  });
});
