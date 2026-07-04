import { isUnauthorized } from "./api/auth.js";
import { handleBackup } from "./api/backup.js";
import { handleDeleteActive } from "./api/activeActions.js";
import { handleDeleteArchive, handleManualArchive, handleRebuildArchive } from "./api/archiveActions.js";
import { handleImportArchiveIndex, handleRebuildArchiveIndex } from "./api/archiveIndexActions.js";
import { handleForceUpdate } from "./api/force.js";
import { handleImportTourConfig } from "./api/tourConfigActions.js";

export class APIRouter {
  static handleBackup = handleBackup;
  static handleForceUpdate = handleForceUpdate;
  static handleRebuildArchive = handleRebuildArchive;
  static handleRebuildArchiveIndex = handleRebuildArchiveIndex;
  static handleImportArchiveIndex = handleImportArchiveIndex;
  static handleImportTourConfig = handleImportTourConfig;
  static handleDeleteActive = handleDeleteActive;
  static handleDeleteArchive = handleDeleteArchive;
  static handleManualArchive = handleManualArchive;
  static isUnauthorized = isUnauthorized;
}
