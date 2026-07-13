import { describe, expect, it } from "vitest";
import { ToolsRouter } from "./tools.js";

describe("ToolsRouter", () => {
  it("keeps the repair page available when TournamentConfig is missing", async () => {
    const request = {
      url: "https://example.test/tools",
      headers: {
        get(name) {
          return name === "Authorization" ? "Bearer secret" : null;
        }
      }
    };
    const env = {
      ADMIN_SECRET: "secret",
      "lol-stats-kv": { get: async () => null }
    };

    const response = await ToolsRouter.handleTools(request, env);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("TournamentConfig unavailable");
    expect(html).toContain("TournamentConfig missing");
  });
});
