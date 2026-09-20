import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ entries: undefined as unknown, fail: false, probeError: undefined as Error | undefined }));
const elevateCalls = vi.hoisted(() => [] as unknown[]);

vi.mock('@wix/essentials', () => ({
  auth: {
    elevate: (fn: unknown) => {
      elevateCalls.push(fn);
      return fn;
    },
  },
}));

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
        // Storage-readiness probe path: query(id).limit(1).find(...) (see createItemsQueryReader).
        limit: () => ({
          find: async () => {
            if (db.probeError) throw db.probeError;
            return { items: [] };
          },
        }),
      };
    }),
    save: async (_collection: string, item: { payload: { entries: unknown } }) => {
      if (db.fail) throw new Error('denied');
      db.entries = structuredClone(item.payload.entries);
    },
  },
  collections: {
    getDataCollection: vi.fn(),
  },
}));

import { assessConfigurationStorage, verifyConfigurationStorage, loadConfiguration, saveConfiguration, initializeConfiguration, COLLECTION_ID } from '../../shared/configuration';
import { collections } from '@wix/data';

beforeEach(() => {
  db.entries = undefined;
  db.fail = false;
  db.probeError = undefined;
  elevateCalls.length = 0;
  vi.mocked(collections.getDataCollection).mockClear();
});

it('dashboard (default, non-elevated) calls never go through auth.elevate', async () => {
  await loadConfiguration();
  await saveConfiguration([{ id: 'one', enabled: true }]);
  await assessConfigurationStorage();
  await verifyConfigurationStorage();
  expect(elevateCalls).toHaveLength(0);
});

it('backend (elevated: true) calls go through auth.elevate for both Data reads and writes', async () => {
  await loadConfiguration({ elevated: true });
  await saveConfiguration([{ id: 'one', enabled: true }], { elevated: true });
  await assessConfigurationStorage({ elevated: true });
  await verifyConfigurationStorage({ elevated: true });
  // items.query (load), items.save, items.query (assess), items.query (verify's internal
  // assess) - one elevate() per call above. Storage checks no longer touch
  // collections.getDataCollection at all (see ROOT CAUSE FIX note in configuration.ts).
  expect(elevateCalls.length).toBeGreaterThanOrEqual(4);
  expect(collections.getDataCollection).not.toHaveBeenCalled();
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

// ROOT CAUSE FIX: assessConfigurationStorage now probes with
// items.query(id).limit(1).find(...) (SCOPE.DC-DATA.READ), not
// collections.getDataCollection (SCOPE.DC-DATA.DATA-COLLECTIONS-MANAGE,
// which no app in this portfolio holds -- see
// packages/core/src/storage/probe.ts for the incident this fixes).
it('reports provisioning when the collection is missing', async () => {
  db.probeError = new Error('WDE0025 data collection was not found');
  const readiness = await assessConfigurationStorage();
  expect(readiness.ready).toBe(false);
  expect(readiness.state).toBe('provisioning');
  await expect(initializeConfiguration()).rejects.toThrow('GiftCraft is still provisioning private storage');
  expect(collections.getDataCollection).not.toHaveBeenCalled();
});

it('verifies the collection is queryable when properly provisioned', async () => {
  const { items } = await import('@wix/data');
  await initializeConfiguration();
  expect(items.query).toHaveBeenCalledWith(COLLECTION_ID);
});

it('reports permission_denied (not provisioning) on forbidden metadata access', async () => {
  db.probeError = new Error('403 Forbidden');
  const readiness = await assessConfigurationStorage();
  expect(readiness.ready).toBe(false);
  expect(readiness.state).toBe('permission_denied');
});

it('reports ready-but-unverified since an items.query probe can never see schema or permissions', async () => {
  // Deliberate, permanent trade-off of the fix: the old getDataCollection-based
  // probe could reject an incompatible schema (e.g. missing fields); an
  // items.query-based probe cannot see collection structure at all, so that
  // detection is no longer possible via the default reader.
  const readiness = await assessConfigurationStorage();
  expect(readiness.ready).toBe(true);
  expect(readiness.state).toBe('ready');
  expect(readiness.items?.[0]?.permissionsVerified).toBe(false);
  expect(collections.getDataCollection).not.toHaveBeenCalled();
});
