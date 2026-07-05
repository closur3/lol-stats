import { TOOLS_ACTIONS } from './tools/toolsActions.js';
import { TOOLS_ARCHIVE_ACTIONS } from './tools/toolsArchiveActions.js';
import { TOOLS_BOOTSTRAP } from './tools/toolsBootstrap.js';
import { TOOLS_REBUILD } from './tools/toolsRebuild.js';

export const TOOLS_SCRIPT = [
  TOOLS_BOOTSTRAP,
  TOOLS_ACTIONS,
  TOOLS_REBUILD,
  TOOLS_ARCHIVE_ACTIONS
].join("\n");
