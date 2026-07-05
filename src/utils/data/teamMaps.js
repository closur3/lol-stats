export function assertTeamAliasMap(teamAliasMap) {
  if (!teamAliasMap || typeof teamAliasMap !== "object" || Array.isArray(teamAliasMap)) {
    throw new Error("ConfigTeams must be a JSON object");
  }
  for (const [rawName, displayName] of Object.entries(teamAliasMap)) {
    if (typeof rawName !== "string" || !rawName.trim()) {
      throw new Error("ConfigTeams raw team name missing");
    }
    if (typeof displayName !== "string" || !displayName.trim()) {
      throw new Error(`ConfigTeams display name missing: ${rawName}`);
    }
  }
  return teamAliasMap;
}

export function filterTeamMapForMatches(teamAliasMap, rawMatches) {
  const baseMap = assertTeamAliasMap(teamAliasMap);
  if (!Array.isArray(rawMatches)) throw new Error("rawMatches must be an array");
  const rawNames = new Set();
  rawMatches.forEach(match => {
    if (match.Team1) rawNames.add(match.Team1);
    if (match.Team2) rawNames.add(match.Team2);
  });
  if (rawNames.size === 0) return baseMap;

  const entries = Object.entries(baseMap).map(([entryKey, value]) => ({ entryKey, value, normalizedKey: String(entryKey).toUpperCase() }));
  const needed = {};

  const pickKeyForRaw = (rawUpper) => {
    let match = entries.find(entry => rawUpper === entry.normalizedKey);
    if (!match) match = entries.find(entry => rawUpper.includes(entry.normalizedKey));
    if (!match) {
      const inputTokens = rawUpper.split(/\s+/);
      match = entries.find(entry => {
        const keyTokens = entry.normalizedKey.split(/\s+/);
        return inputTokens.every(token => keyTokens.includes(token));
      });
    }
    return match ? match.entryKey : null;
  };

  rawNames.forEach(rawName => {
    const resolvedKey = pickKeyForRaw(String(rawName).toUpperCase());
    if (resolvedKey && baseMap[resolvedKey] != null) needed[resolvedKey] = baseMap[resolvedKey];
  });

  return needed;
}

export function pickTeamMap(teamAliasMap, rawMatches) {
  return filterTeamMapForMatches(teamAliasMap, rawMatches);
}
