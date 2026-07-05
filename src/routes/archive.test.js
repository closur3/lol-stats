import { describe, expect, it } from "vitest";
import { ArchiveRouter } from "./archive.js";

function tournament(slug) {
  return {
    slug,
    name: slug,
    league: "TEST",
    overview_page: [`${slug}/Overview`],
    start_date: "2026-01-01",
    end_date: "2026-01-31"
  };
}

describe("ArchiveRouter", () => {
  it("reports every unavailable archive snapshot in one error page", async () => {
    const config = [tournament("missing-one"), tournament("missing-two")];
    const env = {
      "lol-stats-kv": {
        get: async key => key === "CONFIG_ARCHIVE" ? config : null
      }
    };

    const response = await ArchiveRouter.handleArchive({}, env);
    const html = await response.text();

    expect(response.status).toBe(500);
    expect(html).toContain("2 archive snapshots unavailable");
    expect(html).toContain("missing-one");
    expect(html).toContain("missing-two");
    expect(html).toContain("Missing snapshot");
  });
});
