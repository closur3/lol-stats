import { isUnauthorized } from "./api/auth.js";
import { handleBackup } from "./api/backup.js";
import { handleDeleteActive } from "./api/activeActions.js";
import { handleDeleteArchive, handleRebuildArchive } from "./api/archiveActions.js";
import { handleForceUpdate } from "./api/force.js";

export class APIRouter {
  static handleBackup = handleBackup;
  static handleForceUpdate = handleForceUpdate;
  static handleRebuildArchive = handleRebuildArchive;
  static handleDeleteActive = handleDeleteActive;
  static handleDeleteArchive = handleDeleteArchive;
  static isUnauthorized = isUnauthorized;
}
