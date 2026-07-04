import { renderArchiveContentOnly, renderContentOnly } from './templates/content.js';
import { renderPageShell } from './templates/page.js';
import { renderToolsPage } from './templates/tools.js';
import { renderLogPage } from './templates/logs.js';

export class HTMLRenderer {
  static renderContentOnly = renderContentOnly;
  static renderArchiveContentOnly = renderArchiveContentOnly;
  static renderPageShell = renderPageShell;
  static renderToolsPage = renderToolsPage;
  static renderLogPage = renderLogPage;
}
