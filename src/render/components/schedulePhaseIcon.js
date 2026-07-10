const schedulePhaseIcons = {
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
  idle: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  done: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  offday: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6"/><path d="M14 9v6"/>'
};

const schedulePhaseLabels = {
  play: "PLAY",
  idle: "IDLE",
  done: "DONE",
  offday: "OFFDAY"
};

function readSchedulePhaseValue(values, phase, valueName) {
  const value = values[phase];
  if (!value) throw new Error(`Invalid schedule phase for ${valueName}: ${phase}`);
  return value;
}

export function renderSchedulePhaseIcon(phase) {
  const paths = readSchedulePhaseValue(schedulePhaseIcons, phase, "icon");
  return `<svg class="ui-icon schedule-phase-icon schedule-phase-icon-${phase}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

export function getSchedulePhaseLabel(phase) {
  return readSchedulePhaseValue(schedulePhaseLabels, phase, "label");
}
