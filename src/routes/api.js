import { isUnauthorized } from "./api/auth.js";
import { handleBackup } from "./api/backup.js";
import { handleDeleteArchive, handleManualArchive, handleRebuildArchive } from "./api/archiveActions.js";
import { handleForceUpdate } from "./api/force.js";
import { handleRefreshUI } from "./api/refreshUi.js";

export class APIRouter {
  static handleBackup = handleBackup;
  static handleForceUpdate = handleForceUpdate;
  static handleRefreshUI = handleRefreshUI;
  static handleRebuildArchive = handleRebuildArchive;
  static handleDeleteArchive = handleDeleteArchive;
  static handleManualArchive = handleManualArchive;
  static isUnauthorized = isUnauthorized;
}
