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

export function parseScheduleSessionKey(sessionKey, label = "sessionKey") {
  if (typeof sessionKey !== "string" || sessionKey === "") {
    throw new Error(`${label} must be a string`);
  }
  let values;
  try {
    values = JSON.parse(sessionKey);
  } catch (error) {
    throw new Error(`${label} must be a canonical schedule session key`, { cause: error });
  }
  if (!Array.isArray(values) || values.length !== 3) {
    throw new Error(`${label} must be a canonical schedule session key`);
  }
  const overviewPage = readText(values[0], `${label}.overviewPage`);
  const tab = readText(values[1], `${label}.tab`, true);
  const matchDay = readPositiveInteger(values[2], `${label}.matchDay`);
  if (createScheduleSessionKey(overviewPage, tab, matchDay) !== sessionKey) {
    throw new Error(`${label} must be a canonical schedule session key`);
  }
  return { overviewPage, tab, matchDay };
}

export function readScheduleIdentity(rawMatch, label) {
  const overviewPage = readText(rawMatch.OverviewPage, `${label}.OverviewPage`);
  const tab = readText(rawMatch.Tab, `${label}.Tab`, true);
  const matchDay = readPositiveInteger(rawMatch.MatchDay, `${label}.MatchDay`);
  const matchNumber = readPositiveInteger(rawMatch.NMatchInTab, `${label}.NMatchInTab`);
  return {
    overviewPage,
    tab,
    matchDay,
    matchNumber,
    sessionKey: createScheduleSessionKey(overviewPage, tab, matchDay)
  };
}
