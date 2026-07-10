import { describe, expect, it } from "vitest";
import { generateMarkdown } from "../../../.github/scripts/markdownRenderer.js";
import { sortTeams } from "../../utils/data/teamSort.js";
import { renderTournamentSection } from "./content/tournamentSection.js";

const slug = "sort-parity";

function createTeamStats(name, bestOf3FullMatchCount, bestOf3TotalMatchCount) {
  return {
    name,
    bestOf3FullMatchCount,
    bestOf3TotalMatchCount,
    bestOf5FullMatchCount: 0,
    bestOf5TotalMatchCount: 0,
    seriesWinCount: 0,
    seriesTotalMatchCount: 0,
    gameWinCount: 0,
    gameTotalCount: 0,
    winStreakCount: 0,
    lossStreakCount: 0,
    last: null
  };
}

function createTimeGrid() {
  const emptyCell = () => ({
    matches: [],
    totalMatchCount: 0,
    fullLengthMatchCount: 0
  });
  return {
    Total: Array.from({ length: 8 }, emptyCell)
  };
}

function extractWebTeamOrder(html) {
  return Array.from(html.matchAll(/onclick="openTeam\(&quot;sort-parity&quot;, &quot;([^&]+)&quot;\)"/g)).map(match => match[1]);
}

function extractMarkdownTeamOrder(markdown) {
  const teamNames = new Set(Object.values(stats).map(teamStats => teamStats.name));
  return markdown
    .split("\n")
    .map(line => line.match(/^\| ([^|]+) \|/)?.[1])
    .filter(name => teamNames.has(name));
}

const stats = {
  Zeta: createTeamStats("Zeta", 2, 2),
  Alpha: createTeamStats("Alpha", 0, 2),
  Beta: createTeamStats("Beta", 1, 2)
};

describe("default team sort parity", () => {
  it("keeps markdown table order aligned with the web default order", () => {
    const tournament = {
      slug,
      name: "Sort Parity",
      overviewPage: ["Sort Parity"]
    };
    const expectedOrder = sortTeams(stats).map(teamStats => teamStats.name);

    const webHtml = renderTournamentSection(
      tournament,
      { [slug]: stats },
      { [slug]: createTimeGrid() },
      {},
      true
    );
    const markdown = generateMarkdown(tournament, stats, { [slug]: createTimeGrid() });

    expect(extractWebTeamOrder(webHtml)).toEqual(expectedOrder);
    expect(extractMarkdownTeamOrder(markdown)).toEqual(expectedOrder);
  });
});
