import { Analyzer } from "../analyzer.js";

export function buildArchiveSnapshot(tournament, rawMatches, teamMap) {
  if (!Array.isArray(rawMatches)) throw new Error(`Archive rawMatches invalid: ${tournament.slug}`);
  const tournamentWithMap = { ...tournament, teamMap };
  const analysis = Analyzer.runFullAnalysis({ [tournament.slug]: rawMatches }, [tournamentWithMap]);
  const stats = analysis.globalStats[tournament.slug];
  const timeGrid = analysis.timeGrid[tournament.slug];
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) throw new Error(`Archive stats missing: ${tournament.slug}`);
  if (!timeGrid || typeof timeGrid !== "object" || Array.isArray(timeGrid)) throw new Error(`Archive timeGrid missing: ${tournament.slug}`);
  return {
    tournament,
    stats,
    timeGrid,
    teamMap
  };
}
