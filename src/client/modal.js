import { modalBindings } from './modal/modalBindings.js';
import { modalCore } from './modal/modalCore.js';
import { modalDistribution } from './modal/modalDistribution.js';
import { modalHistory } from './modal/modalHistory.js';

export const modalScript = [
  "(function(){",
  modalCore,
  modalDistribution,
  modalHistory,
  modalBindings,
  "})();"
].join("\n");
