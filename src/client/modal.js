import { MODAL_BINDINGS } from './modal/modalBindings.js';
import { MODAL_CORE } from './modal/modalCore.js';
import { MODAL_DISTRIBUTION } from './modal/modalDistribution.js';
import { MODAL_HISTORY } from './modal/modalHistory.js';

export const MODAL_SCRIPT = [
  "(function(){",
  MODAL_CORE,
  MODAL_DISTRIBUTION,
  MODAL_HISTORY,
  MODAL_BINDINGS,
  "})();"
].join("\n");
