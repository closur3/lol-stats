import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { deleteActiveRuntimeFacts } from "./activeTournamentDeletion.js";

function assertMigrations(migrations) {
  if (!Array.isArray(migrations)) throw new Error("archive migrations must be an array");
  for (const migration of migrations) {
    if (!migration || typeof migration !== "object" || Array.isArray(migration)) {
      throw new Error("archive migration must be an object");
    }
    const fields = Object.keys(migration);
    if (fields.length !== 2 || !Object.hasOwn(migration, "slug") || !Object.hasOwn(migration, "snapshot")) {
      throw new Error("archive migration fields must be slug and snapshot");
    }
    if (typeof migration.slug !== "string" || !migration.slug) throw new Error("archive migration slug missing");
    if (migration.snapshot !== null && (!migration.snapshot || typeof migration.snapshot !== "object" || Array.isArray(migration.snapshot))) {
      throw new Error(`archive migration snapshot invalid: ${migration.slug}`);
    }
  }
}

export async function writeArchiveMigrations(env, migrations) {
  assertMigrations(migrations);
  const kv = env["lol-stats-kv"];
  await Promise.all(migrations
    .filter(migration => migration.snapshot !== null)
    .map(migration => kv.put(kvKeys.archive(migration.slug), JSON.stringify(migration.snapshot))));
}

export async function cleanupArchiveMigrations(env, migrations) {
  assertMigrations(migrations);
  await Promise.all(migrations.map(migration => deleteActiveRuntimeFacts(env, migration.slug)));
  if (migrations.length > 0) {
    console.log(`[ARCHIVE:MIGRATE] slugs=${migrations.map(migration => migration.slug).join(",")}`);
  }
}
