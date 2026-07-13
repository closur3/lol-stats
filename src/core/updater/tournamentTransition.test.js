import { describe, expect, it } from "vitest";
import { deriveTournamentTransition } from "./tournamentTransition.js";

function state(activeFingerprints) {
  return { configDigest: "a".repeat(64), activeFingerprints };
}

describe("deriveTournamentTransition", () => {
  it("classifies added, updated, archived, and dropped slugs from desired config", () => {
    const archive = [{ slug: "archived" }];
    const previous = state({ unchanged: "1", updated: "1", archived: "1", dropped: "1" });
    const desired = state({ unchanged: "1", updated: "2", added: "1" });

    expect(deriveTournamentTransition(archive, desired, previous)).toEqual({
      added: ["added"],
      updated: ["updated"],
      archived: ["archived"],
      dropped: ["dropped"]
    });
  });

  it("does not treat archive-only entries as an Active transition", () => {
    expect(deriveTournamentTransition([{ slug: "historical" }], state({}), state({}))).toEqual({
      added: [],
      updated: [],
      archived: [],
      dropped: []
    });
  });
});
