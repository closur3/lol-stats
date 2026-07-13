import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readExistingApplyState: vi.fn(),
  validateRuntime: vi.fn()
}));

vi.mock("../facts/tournamentApplyState.js", () => ({
  readExistingTournamentApplyState: mocks.readExistingApplyState
}));
vi.mock("./tournamentRuntimeValidator.js", () => ({
  assertTournamentRuntimeMatchesConfig: mocks.validateRuntime
}));

import { resolveTournamentApplyBaseline } from "./tournamentApplyBaseline.js";

const DesiredState = {
  configDigest: "a".repeat(64),
  activeFingerprints: { active: "b".repeat(64) }
};
const Config = { active: [{ slug: "active" }], archive: [] };

function createEnv(names = []) {
  return {
    "lol-stats-kv": {
      list: vi.fn(async ({ prefix }) => ({
        keys: names.filter(name => name.startsWith(prefix)).map(name => ({ name })),
        list_complete: true
      }))
    }
  };
}

describe("resolveTournamentApplyBaseline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readExistingApplyState.mockResolvedValue(null);
    mocks.validateRuntime.mockResolvedValue(undefined);
  });

  it("uses the stored checkpoint without inspecting runtime keys", async () => {
    const storedState = { configDigest: "c".repeat(64), activeFingerprints: {} };
    mocks.readExistingApplyState.mockResolvedValue(storedState);
    const env = createEnv();

    await expect(resolveTournamentApplyBaseline(env, Config, DesiredState)).resolves.toBe(storedState);
    expect(env["lol-stats-kv"].list).not.toHaveBeenCalled();
  });

  it("treats a proven empty Active runtime as a fresh baseline", async () => {
    await expect(resolveTournamentApplyBaseline(createEnv(), Config, DesiredState)).resolves.toEqual({
      configDigest: "0".repeat(64),
      activeFingerprints: {}
    });
    expect(mocks.validateRuntime).not.toHaveBeenCalled();
  });

  it("accepts a complete rebuilt runtime as the current baseline", async () => {
    const env = createEnv(["RawMatches_active"]);

    await expect(resolveTournamentApplyBaseline(env, Config, DesiredState)).resolves.toBe(DesiredState);
    expect(mocks.validateRuntime).toHaveBeenCalledWith(env, Config);
  });

  it("fails when missing state cannot account for an Active runtime slug", async () => {
    await expect(resolveTournamentApplyBaseline(createEnv(["ActiveHome_unknown"]), Config, DesiredState))
      .rejects.toThrow("TournamentApplyState missing with unknown Active runtime: unknown");
    expect(mocks.validateRuntime).not.toHaveBeenCalled();
  });
});
