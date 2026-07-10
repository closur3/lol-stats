import { describe, expect, it } from "vitest";
import { HomeRouter } from "./home.js";

function tournament(slug) {
  return {
    slug,
    name: slug,
    leagueShort: "TEST",
    overviewPage: [`${slug}/Overview`],
    teamMap: { [`${slug} Team`]: "TEST" },
    startDate: "2026-01-01",
    endDate: "2026-01-31"
  };
}

describe("HomeRouter", () => {
  it("reports every unavailable ActiveHome in the shared error page", async () => {
    const config = [tournament("missing-one"), tournament("missing-two")];
    const response = await HomeRouter.handleHome({
      "lol-stats-kv": {
        get: async key => key === "ConfigActive" ? config : null
      }
    });
    const html = await response.text();

    expect(response.status).toBe(500);
    expect(html).toContain("Home data is not ready");
    expect(html).toContain("2 ActiveHome unavailable");
    expect(html).toContain("missing-one");
    expect(html).toContain("missing-two");
    expect(html).toContain("Missing ActiveHome");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/tools"');
  });
});
