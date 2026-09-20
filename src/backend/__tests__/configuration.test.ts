import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ entries: undefined as unknown, fail: false }));

vi.mock('@wix/data', () => ({
  items: {
    query: vi.fn(() => {
      const find = async () => {
        if (db.fail) throw new Error('denied');
        return {
          items: db.entries === undefined ? [] : [{ payload: { entries: structuredClone(db.entries) } }],
          hasNext: () => false,
          next: async () => {
            throw new Error('next() should not be called when hasNext() is false');
          },
        };
      };
      return {
        eq: () => ({
          find,
          limit: () => ({ find }),
        }),
      };
    }),
    save: async (_collection: string, item: { payload: { entries: unknown } }) => {
      if (db.fail) throw new Error('denied');
      db.entries = structuredClone(item.payload.entries);
    },
  },
  collections: {
    getDataCollection: vi.fn(async () => ({
      _id: '@krasalgim/giftcraft/giftcraft-options',
      displayField: 'title',
      fields: [{ key: 'title', type: 'TEXT' }, { key: 'payload', type: 'OBJECT' }],
    })),
  },
}));

import { assessConfigurationStorage, loadConfiguration, saveConfiguration, initializeConfiguration, COLLECTION_ID } from '../../shared/configuration';
import { collections } from '@wix/data';

beforeEach(() => {
  db.entries = undefined;
  db.fail = false;
  vi.mocked(collections.getDataCollection).mockResolvedValue({
    _id: COLLECTION_ID,
    displayField: 'title',
    fields: [{ key: 'title', type: 'TEXT' }, { key: 'payload', type: 'OBJECT' }],
  } as never);
});

it('keeps new installations empty, round-trips create/edit/delete without restoring defaults', async () => {
  expect(await loadConfiguration()).toEqual([]);
  await saveConfiguration([{ id: 'one', enabled: true }, { id: 'two', enabled: true }]);
  expect(await loadConfiguration()).toHaveLength(2);
  await saveConfiguration([{ id: 'one', enabled: false }]);
  expect(await loadConfiguration()).toEqual([{ id: 'one', enabled: false }]);
  await saveConfiguration([]);
  expect(await loadConfiguration()).toEqual([]);
});

it('surfaces storage failures instead of reporting a successful save or loading sample data', async () => {
  db.fail = true;
  await expect(saveConfiguration([])).rejects.toThrow('denied');
  await expect(loadConfiguration()).rejects.toThrow('denied');
});

it('reports provisioning when the collection is missing', async () => {
  vi.mocked(collections.getDataCollection).mockRejectedValue(new Error('WDE0025 data collection was not found'));
  const readiness = await assessConfigurationStorage();
  expect(readiness.ready).toBe(false);
  expect(readiness.state).toBe('provisioning');
  await expect(initializeConfiguration()).rejects.toThrow('GiftCraft is still provisioning private storage');
});

it('verifies the collection is queryable when properly provisioned', async () => {
  const { items } = await import('@wix/data');
  await initializeConfiguration();
  expect(items.query).toHaveBeenCalledWith(COLLECTION_ID);
});

it('reports provisioning failures on forbidden metadata access', async () => {
  vi.mocked(collections.getDataCollection).mockRejectedValueOnce(new Error('403 Forbidden'));
  const readiness = await assessConfigurationStorage();
  expect(readiness.ready).toBe(false);
  expect(readiness.state).toBe('provisioning');
});

it('rejects an existing collection with incompatible schema', async () => {
  vi.mocked(collections.getDataCollection).mockResolvedValueOnce({
    _id: COLLECTION_ID,
    displayField: 'title',
    fields: [],
  } as never);
  const readiness = await assessConfigurationStorage();
  expect(readiness.ready).toBe(false);
  expect(readiness.state).toBe('schema_mismatch');
});
