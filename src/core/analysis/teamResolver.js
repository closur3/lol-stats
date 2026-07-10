export function buildTeamNameResolver(teamMap) {
  return (rawName) => {
    if (typeof rawName !== "string" || !rawName) throw new Error("Raw team name missing");
    if (rawName === "TBD") return rawName;
    const resolvedName = teamMap[rawName];
    if (typeof resolvedName !== "string" || !resolvedName) throw new Error(`Team mapping missing: ${rawName}`);
    return resolvedName;
  };
}
