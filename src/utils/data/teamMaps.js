export function assertTeamMap(teamMap, label = "teamMap") {
  if (!teamMap || typeof teamMap !== "object" || Array.isArray(teamMap)) {
    throw new Error(`${label} must be a JSON object`);
  }
  if (Object.keys(teamMap).length === 0) throw new Error(`${label} must not be empty`);
  for (const [rawName, displayName] of Object.entries(teamMap)) {
    if (typeof rawName !== "string" || !rawName.trim()) {
      throw new Error(`${label} raw team name missing`);
    }
    if (typeof displayName !== "string" || !displayName.trim()) {
      throw new Error(`${label} display name missing: ${rawName}`);
    }
  }
  return teamMap;
}
