import { describe, expect, it } from "vitest";
import { renderArchiveErrorPage } from "./error.js";

describe("renderArchiveErrorPage", () => {
  it("renders the repair action and escapes the error detail", () => {
    const html = renderArchiveErrorPage(new Error("Invalid <snapshot>"), "time", "sha");

    expect(html).toContain("Archive data is not ready");
    expect(html).toContain("500 Internal Server Error");
    expect(html).not.toContain("ARCHIVE · 500");
    expect(html).toContain('href="/tools"');
    expect(html).toContain("Invalid &lt;snapshot&gt;");
    expect(html).not.toContain("Invalid <snapshot>");
    expect(html).not.toContain("floatingPageActions");
  });
});
