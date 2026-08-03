import { toolsActions } from './tools/toolsActions.js';
import { toolsBootstrap } from './tools/toolsBootstrap.js';
import { toolsCron } from './tools/toolsCron.js';
import { toolsRebuild } from './tools/toolsRebuild.js';

export const toolsScript = [
  toolsBootstrap,
  toolsActions,
  toolsCron,
  toolsRebuild
].join("\n");
