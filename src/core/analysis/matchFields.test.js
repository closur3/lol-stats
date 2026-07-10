import { describe, expect, it } from "vitest";
import { parseMatchForfeitSide, parseMatchIsNullified, parseMatchWinner, validateMatchOutcome } from "./matchFields.js";

describe("match outcome fields", () => {
  it("maps Fandom FF values to the forfeiting side", () => {
    expect(parseMatchForfeitSide("", "match.FF")).toBeNull();
    expect(parseMatchForfeitSide("0", "match.FF")).toBe(0);
    expect(parseMatchForfeitSide("1", "match.FF")).toBe(1);
    expect(parseMatchForfeitSide("2", "match.FF")).toBe(2);
  });

  it("requires the Fandom winner implied by a forfeit", () => {
    expect(() => validateMatchOutcome(parseMatchWinner("1", "match.Winner"), 1, false, "match")).toThrow("FF Team1 requires Winner 2");
    expect(() => validateMatchOutcome(parseMatchWinner("2", "match.Winner"), 1, false, "match")).not.toThrow();
    expect(() => validateMatchOutcome(parseMatchWinner("0", "match.Winner"), 0, false, "match")).not.toThrow();
  });

  it("requires explicit boolean IsNullified values", () => {
    expect(parseMatchIsNullified("0", "match.IsNullified")).toBe(false);
    expect(parseMatchIsNullified("1", "match.IsNullified")).toBe(true);
    expect(() => parseMatchIsNullified(undefined, "match.IsNullified")).toThrow("Missing IsNullified");
  });
});
