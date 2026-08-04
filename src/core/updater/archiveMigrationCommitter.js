import { kvKeys } from "../../infrastructure/kv/keyFactory.js";
import { deleteActiveRuntimeFacts } from "./activeTournamentDeletion.js";

function assertMigrations(migrations) {
  if (!Array.isArray(migrations)) throw new Error("archive migrations must be an array");
  for (const migration of migrations) {
    if (!migration || typeof migration !== "object" || Array.isArray(migration)) {
      throw new Error("archive migration must be an object");
    }
    const fields = Object.keys(migration);
    if (fields.length !== 2 || !Object.hasOwn(migration, "tournamentName") || !Object.hasOwn(migration, "snapshot")) {
      throw new Error("archive migration fields must be tournamentName and snapshot");
    }
    if (typeof migration.tournamentName !== "string" || !migration.tournamentName) throw new Error("archive migration tournamentName missing");
    if (migration.snapshot !== null && (!migration.snapshot || typeof migration.snapshot !== "object" || Array.isArray(migration.snapshot))) {
      throw new Error(`archive migration snapshot invalid: ${migration.tournamentName}`);
    }
  }
}

export async function writeArchiveMigrations(env, migrations) {
  assertMigrations(migrations);
  const kv = env["lol-stats-kv"];
  await Promise.all(migrations
    .filter(migration => migration.snapshot !== null)
    .map(migration => kv.put(kvKeys.archive(migration.tournamentName), JSON.stringify(migration.snapshot))));
}

export async function cleanupArchiveMigrations(env, migrations) {
  assertMigrations(migrations);
  await Promise.all(migrations.map(migration => deleteActiveRuntimeFacts(env, migration.tournamentName)));
  if (migrations.length > 0) {
    console.log(`[ARCHIVE:MIGRATE] names=${migrations.map(migration => migration.tournamentName).join(",")}`);
  }
}
