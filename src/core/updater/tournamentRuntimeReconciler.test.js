import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readConfig: vi.fn(),
  buildApplyState: vi.fn(),
  resolveApplyBaseline: vi.fn(),
  writeApplyState: vi.fn(),
  runSchedules: vi.fn(),
  migrateArchives: vi.fn(),
  forceActive: vi.fn(),
  deleteActive: vi.fn(),
  validateRuntime: vi.fn()
}));

vi.mock("../facts/tournamentConfigReader.js", () => ({ readTournamentConfig: mocks.readConfig }));
vi.mock("../facts/tournamentConfigFingerprint.js", () => ({ buildTournamentApplyState: mocks.buildApplyState }));
vi.mock("../facts/tournamentApplyState.js", () => ({
  writeTournamentApplyState: mocks.writeApplyState
}));
vi.mock("./tournamentApplyBaseline.js", () => ({ resolveTournamentApplyBaseline: mocks.resolveApplyBaseline }));
vi.mock("../scheduler/scheduleMaintenanceRunner.js", () => ({ runScheduleMaintenance: mocks.runSchedules }));
vi.mock("./archiveMigration.js", () => ({ migrateArchiveTournaments: mocks.migrateArchives }));
vi.mock("./activeForceRunner.js", () => ({ forceActiveTournaments: mocks.forceActive }));
vi.mock("./activeTournamentDeletion.js", () => ({ deleteActiveRuntimeFacts: mocks.deleteActive }));
vi.mock("./tournamentRuntimeValidator.js", () => ({ assertTournamentRuntimeMatchesConfig: mocks.validateRuntime }));

import { reconcileTournamentRuntime } from "./tournamentRuntimeReconciler.js";

const Digest = "a".repeat(64);
const Fingerprints = {
  added: "1",
  updated: "2"
};
const Config = {
  active: [{ slug: "added" }, { slug: "updated" }],
  archive: [{ slug: "archived" }]
};
const PreviousState = {
  configDigest: "b".repeat(64),
  activeFingerprints: { updated: "1", archived: "1", dropped: "1" }
};
const DesiredState = { configDigest: Digest, activeFingerprints: Fingerprints };

describe("reconcileTournamentRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readConfig.mockResolvedValue(Config);
    mocks.buildApplyState.mockResolvedValue(DesiredState);
    mocks.resolveApplyBaseline.mockResolvedValue(PreviousState);
    mocks.writeApplyState.mockResolvedValue(undefined);
    mocks.runSchedules.mockResolvedValue(undefined);
    mocks.migrateArchives.mockResolvedValue({ migrated: ["archived"] });
    mocks.forceActive.mockResolvedValue(undefined);
    mocks.deleteActive.mockResolvedValue(undefined);
    mocks.validateRuntime.mockResolvedValue(undefined);
  });

  it("derives and applies the complete transition before advancing the checkpoint", async () => {
    const result = await reconcileTournamentRuntime({}, 123, {});

    expect(result.transition).toEqual({
      added: ["added"],
      updated: ["updated"],
      archived: ["archived"],
      dropped: ["dropped"]
    });
    expect(mocks.migrateArchives).toHaveBeenCalledWith({}, Config.archive, new Set(["archived"]));
    expect(mocks.forceActive).toHaveBeenCalledWith({}, Config.active, new Set(["added", "updated"]));
    expect(mocks.deleteActive).toHaveBeenCalledWith({}, "dropped");
    expect(mocks.writeApplyState).toHaveBeenCalledWith({}, DesiredState);
  });

  it("does not advance the checkpoint when final runtime validation fails", async () => {
    mocks.validateRuntime.mockRejectedValue(new Error("runtime incomplete"));

    await expect(reconcileTournamentRuntime({}, 123, {})).rejects.toThrow("runtime incomplete");
    expect(mocks.writeApplyState).not.toHaveBeenCalled();
  });
});
