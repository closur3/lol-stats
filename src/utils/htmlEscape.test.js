import { describe, expect, it } from "vitest";
import { serializeForInlineScript } from "./htmlEscape.js";

describe("serializeForInlineScript", () => {
  it("cannot terminate its containing script element", () => {
    const serialized = serializeForInlineScript({ teamName: "</script><script>alert(1)</script>" });

    expect(serialized).not.toContain("</script>");
    expect(JSON.parse(serialized)).toEqual({ teamName: "</script><script>alert(1)</script>" });
  });
});
