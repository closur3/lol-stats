const ActiveHomePrefix = "ActiveHome_";
const ActiveLogPrefix = "ActiveLog_";
const ArchiveSnapshotPrefix = "ArchiveSnapshot_";
const FandomRevisionPrefix = "FandomRevision_";
const RawMatchesPrefix = "RawMatches_";
const ScheduleMetaPrefix = "ScheduleMeta_";

export const kvKeys = {
  ActiveHomePrefix,
  ActiveLogPrefix,
  ArchiveSnapshotPrefix,
  FandomRevisionPrefix,
  RawMatchesPrefix,
  ScheduleMetaPrefix,

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
  scheduleMeta(slug) {
    return `${ScheduleMetaPrefix}${slug}`;
  },
  scheduleState() {
    return "ScheduleState";
  },
  configActive() {
    return "ConfigActive";
  },
  configArchive() {
    return "ConfigArchive";
  }
};
