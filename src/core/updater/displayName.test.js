import { describe, expect, it } from "vitest";
import { buildDisplayNameMap, getDisplayName } from "./displayName.js";

describe("tournament display names", () => {
  it("uses leagueShort as the display name", () => {
    const displayNames = buildDisplayNameMap([{ slug: "opening", leagueShort: "LCK", name: "Season Opening" }]);
    expect(getDisplayName(displayNames, "opening")).toBe("LCK");
  });

  it("fails when leagueShort is missing", () => {
    expect(() => buildDisplayNameMap([{ slug: "broken", name: "Broken Tournament" }])).toThrow("Tournament leagueShort missing: broken");
  });

  it("keeps an empty leagueShort as an intentional empty display name", () => {
    const displayNames = buildDisplayNameMap([{ slug: "opening", leagueShort: "", name: "Season Opening" }]);
    expect(getDisplayName(displayNames, "opening")).toBe("");
  });

  it("fails for an unknown slug", () => {
    expect(() => getDisplayName(new Map(), "missing")).toThrow("Tournament display name missing: missing");
  });
});
