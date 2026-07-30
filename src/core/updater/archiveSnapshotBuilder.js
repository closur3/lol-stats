import { analyzeTournaments } from "../analyzer.js";

export function buildArchiveSnapshot(tournament, rawMatches) {
  if (!Array.isArray(rawMatches)) throw new Error(`Archive rawMatches invalid: ${tournament.slug}`);
  const analysis = analyzeTournaments({ [tournament.slug]: rawMatches }, [tournament]);
  const statistics = analysis.statisticsBySlug[tournament.slug];
  const timeGrid = analysis.timeGrid[tournament.slug];
  if (!statistics || typeof statistics !== "object" || Array.isArray(statistics)) throw new Error(`Archive statistics missing: ${tournament.slug}`);
  if (!timeGrid || typeof timeGrid !== "object" || Array.isArray(timeGrid)) throw new Error(`Archive timeGrid missing: ${tournament.slug}`);
  const tournamentStored = { ...tournament };
  delete tournamentStored.teamMap;
  delete tournamentStored.participantGroups;
  return {
    tournament: tournamentStored,
    statistics,
    timeGrid
  };
}
