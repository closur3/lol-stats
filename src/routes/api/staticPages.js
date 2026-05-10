import { Updater } from "../../core/updater.js";

export async function rebuildStaticPagesFromCache(env) {
  try {
    const updater = new Updater(env);
    return await updater.rebuildStaticPagesFromCache({ includeArchive: true, requireData: true });
  } catch (error) {
    return { ok: false, reason: "ERROR", message: `Render Error: ${error.message}` };
  }
}

export async function generateArchiveStaticHTML(env) {
  const updater = new Updater(env);
  return updater.generateArchiveStaticHTML();
}
