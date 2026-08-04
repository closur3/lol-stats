const ActiveSnapshotPrefix = "ActiveSnapshot_";
const ActiveLogPrefix = "ActiveLog_";
const ArchiveSnapshotPrefix = "ArchiveSnapshot_";
const FandomRevisionPrefix = "FandomRevision_";
const RawMatchesPrefix = "RawMatches_";
const ScheduleSessionsPrefix = "ScheduleSessions_";

export const kvKeys = {
  ActiveSnapshotPrefix,
  ActiveLogPrefix,
  ArchiveSnapshotPrefix,
  FandomRevisionPrefix,
  RawMatchesPrefix,
  ScheduleSessionsPrefix,

  active(tournamentName) {
    return `${ActiveSnapshotPrefix}${tournamentName}`;
  },
  log(tournamentName) {
    return `${ActiveLogPrefix}${tournamentName}`;
  },
  archive(tournamentName) {
    return `${ArchiveSnapshotPrefix}${tournamentName}`;
  },
  rev(tournamentName) {
    return `${FandomRevisionPrefix}${tournamentName}`;
  },
  rawMatches(tournamentName) {
    return `${RawMatchesPrefix}${tournamentName}`;
  },
  scheduleSessions(tournamentName) {
    return `${ScheduleSessionsPrefix}${tournamentName}`;
  },
  scheduleState() {
    return "ScheduleState";
  },
  tournamentConfig() {
    return "TournamentConfig";
  },
  tournamentApplyState() {
    return "TournamentApplyState";
  }
};
