export function isFlatTeamMap(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  return typeof obj[keys[0]] === "string";
}

export function filterTeamMapForMatches(baseMap, rawMatches = []) {
  if (!baseMap || typeof baseMap !== "object") return {};
  const rawNames = new Set();
  rawMatches.forEach(match => {
    if (match.Team1) rawNames.add(match.Team1);
    if (match.Team2) rawNames.add(match.Team2);
  });
  if (rawNames.size === 0) return baseMap || {};

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

export function pickTeamMap(teamsRaw, tournament, rawMatches) {
  if (!teamsRaw || typeof teamsRaw !== "object") return {};
  let base = {};
  if (teamsRaw.by_slug && teamsRaw.by_slug[tournament.slug]) base = teamsRaw.by_slug[tournament.slug];
  else if (teamsRaw.by_league && teamsRaw.by_league[tournament.league]) base = teamsRaw.by_league[tournament.league];
  else if (teamsRaw[tournament.slug] && typeof teamsRaw[tournament.slug] === "object") base = teamsRaw[tournament.slug];
  else if (teamsRaw[tournament.league] && typeof teamsRaw[tournament.league] === "object") base = teamsRaw[tournament.league];
  else if (isFlatTeamMap(teamsRaw)) base = teamsRaw;
  return filterTeamMapForMatches(base, rawMatches);
}
