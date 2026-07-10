import { describe, expect, it } from "vitest";
import { buildTeamNameResolver } from "./teamResolver.js";

describe("buildTeamNameResolver", () => {
  it("resolves only exact tournament team names", () => {
    const resolveTeamName = buildTeamNameResolver({
      "AG.AL": "AGAL",
      "Team Secret (Vietnamese Team)": "TS"
    });

    expect(resolveTeamName("AG.AL")).toBe("AGAL");
    expect(resolveTeamName("Team Secret (Vietnamese Team)")).toBe("TS");
    expect(() => resolveTeamName("Team Secret")).toThrow("Team mapping missing: Team Secret");
  });
});
