import { createSchemaIssue, describeSchemaValue } from "./schemaIssue.js";

function issue(artifactKey, path, expected, actual) {
  return createSchemaIssue({
    artifactKey,
    path,
    kind: actual == null ? "missing" : "invalid",
    expected,
    ...(actual == null ? {} : { actual: typeof actual === "string" ? actual : describeSchemaValue(actual) })
  });
}

export function readTournamentStatisticsIssue(statistics, tournament, artifactKey) {
  if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) {
    return issue(artifactKey, "statistics", "object", statistics);
  }
  const fields = Object.keys(statistics);
  const expectedFields = ["combined", "pages"];
  if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(statistics, field))) {
    return issue(artifactKey, "statistics", "fields combined and pages", fields.join(", "));
  }
  if (!statistics.combined || typeof statistics.combined !== "object" || Array.isArray(statistics.combined)) {
    return issue(artifactKey, "statistics.combined", "object", statistics.combined);
  }
  if (!Array.isArray(statistics.pages)) {
    return issue(artifactKey, "statistics.pages", "array", statistics.pages);
  }
  if (!Array.isArray(tournament.overviewPage) || statistics.pages.length !== tournament.overviewPage.length) {
    return issue(
      artifactKey,
      "statistics.pages",
      "one entry per tournament overviewPage",
      `${statistics.pages.length} entries`
    );
  }

  for (const [pageIndex, page] of statistics.pages.entries()) {
    const pagePath = `statistics.pages[${pageIndex}]`;
    if (!page || typeof page !== "object" || Array.isArray(page)) {
      return issue(artifactKey, pagePath, "object", page);
    }
    const pageFields = Object.keys(page);
    const expectedPageFields = ["overviewPage", "groups", "stats"];
    if (pageFields.length !== expectedPageFields.length || expectedPageFields.some(field => !Object.hasOwn(page, field))) {
      return issue(artifactKey, pagePath, "fields overviewPage, groups and stats", pageFields.join(", "));
    }
    if (page.overviewPage !== tournament.overviewPage[pageIndex]) {
      return issue(
        artifactKey,
        `${pagePath}.overviewPage`,
        tournament.overviewPage[pageIndex],
        page.overviewPage
      );
    }
    if (!page.stats || typeof page.stats !== "object" || Array.isArray(page.stats)) {
      return issue(artifactKey, `${pagePath}.stats`, "object", page.stats);
    }
    if (!Array.isArray(page.groups)) {
      return issue(artifactKey, `${pagePath}.groups`, "array", page.groups);
    }

    const memberships = new Set();
    for (const [groupIndex, group] of page.groups.entries()) {
      const groupPath = `${pagePath}.groups[${groupIndex}]`;
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        return issue(artifactKey, groupPath, "object", group);
      }
      const groupFields = Object.keys(group);
      const expectedGroupFields = ["groupDisplay", "teams"];
      if (groupFields.length !== expectedGroupFields.length || expectedGroupFields.some(field => !Object.hasOwn(group, field))) {
        return issue(artifactKey, groupPath, "fields groupDisplay and teams", groupFields.join(", "));
      }
      if (typeof group.groupDisplay !== "string" || !group.groupDisplay) {
        return issue(artifactKey, `${groupPath}.groupDisplay`, "non-empty string", group.groupDisplay);
      }
      if (!Array.isArray(group.teams) || group.teams.length === 0) {
        return issue(artifactKey, `${groupPath}.teams`, "non-empty string array", group.teams);
      }
      for (const [teamIndex, teamName] of group.teams.entries()) {
        if (typeof teamName !== "string" || !teamName) {
          return issue(artifactKey, `${groupPath}.teams[${teamIndex}]`, "non-empty string", teamName);
        }
        if (memberships.has(teamName)) {
          return issue(artifactKey, `${groupPath}.teams[${teamIndex}]`, "unique page membership", teamName);
        }
        memberships.add(teamName);
      }
    }

    if (page.groups.length > 0) {
      const missingTeams = Object.keys(page.stats)
        .filter(teamName => teamName !== "TBD" && !memberships.has(teamName))
        .sort();
      if (missingTeams.length > 0) {
        return issue(
          artifactKey,
          `${pagePath}.groups`,
          "membership for every page stats team",
          missingTeams.join(", ")
        );
      }
    }
  }
  return null;
}
