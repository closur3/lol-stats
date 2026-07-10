import { toolsActions } from './tools/toolsActions.js';
import { toolsArchiveActions } from './tools/toolsArchiveActions.js';
import { toolsBootstrap } from './tools/toolsBootstrap.js';
import { toolsRebuild } from './tools/toolsRebuild.js';

export const toolsScript = [
  toolsBootstrap,
  toolsActions,
  toolsRebuild,
  toolsArchiveActions
].join("\n");
