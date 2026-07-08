import { describe, expect, it } from "vitest";
import { buildResolveName } from "./teamResolver.js";

describe("buildResolveName", () => {
  it("resolves only exact tournament team names", () => {
    const resolveName = buildResolveName({
      "AG.AL": "AGAL",
      "Team Secret (Vietnamese Team)": "TS"
    });

    expect(resolveName("AG.AL")).toBe("AGAL");
    expect(resolveName("Team Secret (Vietnamese Team)")).toBe("TS");
    expect(() => resolveName("Team Secret")).toThrow("Team mapping missing: Team Secret");
  });
});
