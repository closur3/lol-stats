import { runFullAnalysis } from "../analyzer.js";

export function buildArchiveSnapshot(tournament, rawMatches) {
  if (!Array.isArray(rawMatches)) throw new Error(`Archive rawMatches invalid: ${tournament.slug}`);
  const analysis = runFullAnalysis({ [tournament.slug]: rawMatches }, [tournament]);
  const stats = analysis.globalStats[tournament.slug];
  const timeGrid = analysis.timeGrid[tournament.slug];
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) throw new Error(`Archive stats missing: ${tournament.slug}`);
  if (!timeGrid || typeof timeGrid !== "object" || Array.isArray(timeGrid)) throw new Error(`Archive timeGrid missing: ${tournament.slug}`);
  const tournamentStored = { ...tournament };
  delete tournamentStored.teamMap;
  return {
    tournament: tournamentStored,
    stats,
    timeGrid
  };
}
