const FinishedResultCodes = new Set(["WIN", "LOSS", "DRAW"]);
const MatchResultCodes = new Set([...FinishedResultCodes, "LIVE", "NEXT"]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function projectArtifactMatches(artifact) {
  assertObject(artifact, "H2H artifact");
  assertObject(artifact.tournament, "H2H tournament");
  assertObject(artifact.stats, `H2H stats: ${artifact.tournament.slug || "unknown"}`);

  const { slug, leagueShort } = artifact.tournament;
  if (typeof slug !== "string" || !slug) throw new Error("H2H tournament slug missing");
  if (typeof leagueShort !== "string" || !leagueShort) throw new Error(`H2H leagueShort missing: ${slug}`);

  const matches = [];
  for (const [teamName, teamStats] of Object.entries(artifact.stats)) {
    assertObject(teamStats, `H2H team stats: ${slug}:${teamName}`);
    if (!Array.isArray(teamStats.history)) throw new Error(`H2H history missing: ${slug}:${teamName}`);

    for (const match of teamStats.history) {
      assertObject(match, `H2H match: ${slug}:${teamName}`);
      if (match.scheduleSlot !== 1 && match.scheduleSlot !== 2) {
        throw new Error(`Invalid H2H scheduleSlot: ${slug}:${teamName}`);
      }
      if (!MatchResultCodes.has(match.matchResultCode)) {
        throw new Error(`Invalid H2H result code: ${slug}:${teamName}`);
      }
      if (match.scheduleSlot === 2 || !FinishedResultCodes.has(match.matchResultCode)) continue;
      if (typeof match.opponentName !== "string" || !match.opponentName) {
        throw new Error(`H2H opponent missing: ${slug}:${teamName}`);
      }

      matches.push({
        tournamentSlug: slug,
        leagueShort,
        leftTeamName: teamName,
        rightTeamName: match.opponentName,
        dateDisplay: match.dateDisplay,
        fullDateDisplay: match.fullDateDisplay,
        scoreDisplay: match.scoreDisplay,
        matchResultCode: match.matchResultCode,
        bestOf: match.bestOf,
        isForfeit: match.isForfeit,
        isFullLength: match.isFullLength,
        timestamp: match.timestamp,
        ...(Array.isArray(match.gameResults) ? { gameResults: match.gameResults } : {}),
        ...(match.turnaroundType == null ? {} : { turnaroundType: match.turnaroundType })
      });
    }
  }
  return matches;
}

export function buildH2HMatches(activeHomes, archiveSnapshots) {
  if (!Array.isArray(activeHomes)) throw new Error("activeHomes must be an array");
  if (!Array.isArray(archiveSnapshots)) throw new Error("archiveSnapshots must be an array");

  return [...activeHomes, ...archiveSnapshots]
    .flatMap(projectArtifactMatches)
    .sort((leftMatch, rightMatch) => rightMatch.timestamp - leftMatch.timestamp);
}
