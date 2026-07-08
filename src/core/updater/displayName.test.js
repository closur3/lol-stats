import { describe, expect, it } from "vitest";
import { buildDisplayNameMap, getDisplayName } from "./displayName.js";

describe("tournament display names", () => {
  it("uses name when the league fact is empty", () => {
    const displayNames = buildDisplayNameMap([{ slug: "opening", league: "", name: "Season Opening" }]);
    expect(getDisplayName(displayNames, "opening")).toBe("Season Opening");
  });

  it("fails for an unknown slug", () => {
    expect(() => getDisplayName(new Map(), "missing")).toThrow("Tournament display name missing: missing");
  });
});
