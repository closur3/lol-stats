import { describe, expect, it } from 'vitest';
import { kvKeys } from '../../infrastructure/kv/keyFactory.js';
import { rebuildArchiveIndexFromSnapshots, writeArchiveIndex } from './archiveIndex.js';

function makeEnv(entries = {}) {
  const store = new Map(Object.entries(entries));
  return {
    "lol-stats-kv": {
      async list({ prefix }) {
        return {
          keys: Array.from(store.keys())
            .filter(name => name.startsWith(prefix))
            .map(name => ({ name }))
        };
      },
      async get(key) {
        return store.get(key) ?? null;
      },
      async put(key, value) {
        store.set(key, JSON.parse(value));
      }
    },
    store
  };
}

function makeTournament(slug = "archive-one") {
  return {
    slug,
    name: "Archive One",
    league: "ARC",
    overview_page: ["Archive One"],
    start_date: "2026-01-01",
    end_date: "2026-01-02"
  };
}

describe('archiveIndex', () => {
  it('does not rebuild CONFIG_ARCHIVE from empty local archive snapshots by default', async () => {
    const env = makeEnv();

    await expect(rebuildArchiveIndexFromSnapshots(env)).rejects.toThrow("empty ARCHIVE snapshots");
    expect(env.store.has(kvKeys.configArchive())).toBe(false);
  });

  it('requires explicit permission before writing an empty CONFIG_ARCHIVE', async () => {
    const env = makeEnv();

    await expect(writeArchiveIndex(env, [])).rejects.toThrow("empty CONFIG_ARCHIVE");
    await expect(writeArchiveIndex(env, [], { allowEmpty: true })).resolves.toEqual([]);
    expect(env.store.get(kvKeys.configArchive())).toEqual([]);
  });

  it('rebuilds CONFIG_ARCHIVE from local archive snapshots when snapshots exist', async () => {
    const tournament = makeTournament();
    const env = makeEnv({
      [kvKeys.archive(tournament.slug)]: { tournament }
    });

    await expect(rebuildArchiveIndexFromSnapshots(env)).resolves.toEqual([tournament]);
    expect(env.store.get(kvKeys.configArchive())).toEqual([tournament]);
  });
});
