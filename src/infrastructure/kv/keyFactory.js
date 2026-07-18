const ActiveHomePrefix = "ActiveHome_";
const ActiveLogPrefix = "ActiveLog_";
const ArchiveSnapshotPrefix = "ArchiveSnapshot_";
const FandomRevisionPrefix = "FandomRevision_";
const RawMatchesPrefix = "RawMatches_";
const ScheduleCarryoverPrefix = "ScheduleCarryover_";
const ScheduleSessionsPrefix = "ScheduleSessions_";

export const kvKeys = {
  ActiveHomePrefix,
  ActiveLogPrefix,
  ArchiveSnapshotPrefix,
  FandomRevisionPrefix,
  RawMatchesPrefix,
  ScheduleCarryoverPrefix,
  ScheduleSessionsPrefix,

  home(slug) {
    return `${ActiveHomePrefix}${slug}`;
  },
  log(slug) {
    return `${ActiveLogPrefix}${slug}`;
  },
  archive(slug) {
    return `${ArchiveSnapshotPrefix}${slug}`;
  },
  rev(slug) {
    return `${FandomRevisionPrefix}${slug}`;
  },
  rawMatches(slug) {
    return `${RawMatchesPrefix}${slug}`;
  },
  scheduleCarryover(slug) {
    return `${ScheduleCarryoverPrefix}${slug}`;
  },
  scheduleSessions(slug) {
    return `${ScheduleSessionsPrefix}${slug}`;
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
