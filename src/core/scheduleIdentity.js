function readPositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || String(value).trim() === "") {
    throw new Error(`${label} must be a positive integer`);
  }
  return number;
}

function readText(value, label, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

export function createScheduleSessionKey(overviewPage, tab, matchDay) {
  return JSON.stringify([overviewPage, tab, matchDay]);
}

export function readScheduleIdentity(rawMatch, label) {
  const overviewPage = readText(rawMatch.OverviewPage, `${label}.OverviewPage`);
  const tab = readText(rawMatch.Tab, `${label}.Tab`, true);
  const matchDay = readPositiveInteger(rawMatch.matchDay, `${label}.matchDay`);
  const matchNumber = readPositiveInteger(rawMatch.nMatchInTab, `${label}.nMatchInTab`);
  return {
    overviewPage,
    tab,
    matchDay,
    matchNumber,
    sessionKey: createScheduleSessionKey(overviewPage, tab, matchDay)
  };
}
