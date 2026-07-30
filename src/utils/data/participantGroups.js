function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

export function assertParticipantGroups(participantGroups, overviewPages, teamMap, label = "participantGroups") {
  if (!Array.isArray(participantGroups)) throw new Error(`${label} must be an array`);
  if (!Array.isArray(overviewPages) || overviewPages.length === 0) {
    throw new Error(`${label} overviewPages must be a non-empty array`);
  }
  if (!teamMap || typeof teamMap !== "object" || Array.isArray(teamMap)) {
    throw new Error(`${label} teamMap must be an object`);
  }

  const overviewPageSet = new Set(overviewPages);
  const groupKeys = new Set();
  const membershipKeys = new Set();

  return participantGroups.map((group, index) => {
    const groupLabel = `${label}[${index}]`;
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new Error(`${groupLabel} must be an object`);
    }
    const fields = Object.keys(group);
    const expectedFields = ["overviewPage", "groupDisplay", "teams"];
    if (fields.length !== expectedFields.length || expectedFields.some(field => !Object.hasOwn(group, field))) {
      throw new Error(`${groupLabel} fields must match the schema`);
    }

    const overviewPage = requireText(group.overviewPage, `${groupLabel}.overviewPage`);
    const groupDisplay = requireText(group.groupDisplay, `${groupLabel}.groupDisplay`);
    if (!overviewPageSet.has(overviewPage)) {
      throw new Error(`${groupLabel}.overviewPage is outside tournament scope`);
    }
    if (!Array.isArray(group.teams) || group.teams.length === 0) {
      throw new Error(`${groupLabel}.teams must be a non-empty array`);
    }

    const groupKey = JSON.stringify([overviewPage, groupDisplay]);
    if (groupKeys.has(groupKey)) throw new Error(`${groupLabel} duplicates a group`);
    groupKeys.add(groupKey);

    const teams = group.teams.map((team, teamIndex) => {
      const normalizedTeam = requireText(team, `${groupLabel}.teams[${teamIndex}]`);
      if (!Object.hasOwn(teamMap, normalizedTeam)) {
        throw new Error(`${groupLabel} team missing from teamMap: ${normalizedTeam}`);
      }
      const membershipKey = JSON.stringify([overviewPage, normalizedTeam]);
      if (membershipKeys.has(membershipKey)) {
        throw new Error(`${groupLabel} duplicates a team membership: ${normalizedTeam}`);
      }
      membershipKeys.add(membershipKey);
      return normalizedTeam;
    });

    return { overviewPage, groupDisplay, teams };
  });
}
