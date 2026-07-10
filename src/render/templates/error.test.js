import { describe, expect, it } from "vitest";
import { renderDataErrorPage } from "./error.js";

describe("renderDataErrorPage", () => {
  it("renders the repair action and escapes the error detail", () => {
    const html = renderDataErrorPage(new Error("Invalid <snapshot>"), "time", "sha", {
      dataLabel: "Archive",
      navMode: "archive",
      retryHref: "/archive"
    });

    expect(html).toContain("Archive data is not ready");
    expect(html).toContain("500 Internal Server Error");
    expect(html).not.toContain("ARCHIVE · 500");
    expect(html).toContain('href="/tools"');
    expect(html).toContain("Invalid &lt;snapshot&gt;");
    expect(html).not.toContain("Invalid <snapshot>");
    expect(html).not.toContain("floatingPageActions");
  });
});
