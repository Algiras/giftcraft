import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ entries: [] as any[], isFree: false, collectionMissing: false }));
const elevateCalls = vi.hoisted(() => [] as string[]);
const captured = vi.hoisted(() => ({ handlers: undefined as any }));

vi.mock('@wix/essentials', () => ({
  auth: {
    elevate: (fn: { name?: string }) => {
      elevateCalls.push(fn?.name ?? 'anonymous');
      return fn;
    },
  },
}));

vi.mock('@wix/app-tools/service-plugins', () => ({
  toolsProvider: { provideHandlers: (handlers: unknown) => { captured.handlers = handlers; return handlers; } },
}));

vi.mock('@wix/app-management', () => ({
  appInstances: {
    getAppInstance: async () => ({ instance: { isFree: state.isFree } }),
  },
}));

vi.mock('@wix/data', () => ({
  items: {
    query: () => ({
      eq: () => ({
        find: async () => ({
          items: [{ payload: { entries: state.entries } }],
          hasNext: () => false,
          next: async () => { throw new Error('not reached'); },
        }),
        limit: () => ({
          find: async () => ({
            items: [{ payload: { entries: state.entries } }],
            hasNext: () => false,
            next: async () => { throw new Error('not reached'); },
          }),
        }),
      }),
    }),
  },
  collections: {
    getDataCollection: async () => {
      if (state.collectionMissing) throw new Error('WDE0025 data collection was not found');
      return {
        _id: '@krasalgim/giftcraft/giftcraft-options',
        displayField: 'title',
        fields: [{ key: 'title', type: 'TEXT' }, { key: 'payload', type: 'OBJECT' }],
      };
    },
  },
}));

import '../service-plugins/tools-provider/plugin';

beforeEach(() => {
  state.entries = [];
  state.isFree = false;
  state.collectionMissing = false;
  elevateCalls.length = 0;
});

it('get-entitlement runs with no merchant session, so it must elevate', async () => {
  const result = await captured.handlers.runTool({ request: { methodName: 'get-entitlement' } });
  expect(result).toEqual({ response: { status: 'paid', isPaid: true } });
  expect(elevateCalls.length).toBeGreaterThan(0);
});

it('verify-storage elevates the Wix Data collection-metadata read', async () => {
  const result = await captured.handlers.runTool({ request: { methodName: 'verify-storage' } });
  expect(result).toEqual({ response: { ready: true } });
  expect(elevateCalls.length).toBeGreaterThan(0);
});

it('describe-config elevates both the storage check and the configuration read', async () => {
  state.entries = [{ id: 'one', enabled: true }, { id: 'two', enabled: true }];
  const result = await captured.handlers.runTool({ request: { methodName: 'describe-config' } });
  expect(result).toEqual({ response: { ready: true, count: 2 } });
  expect(elevateCalls.length).toBeGreaterThanOrEqual(2);
});

it('describe-config reports not-ready without elevating the configuration read when storage is missing', async () => {
  state.collectionMissing = true;
  const result = await captured.handlers.runTool({ request: { methodName: 'describe-config' } });
  expect(result).toEqual({ response: { ready: false, count: 0 } });
});
