import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import {
  assessStorageRequirements,
  classifyStorageFailure,
  createItemsQueryReader,
  provisioningMessage,
  type StorageReadinessAssessment,
  withStorageTimeout,
} from '@wix-extensions/core/storage';

/**
 * This module is shared between the dashboard (browser, merchant session present)
 * and backend contexts with no merchant session (App Tools provider, SPI plugins).
 * Every exported function below defaults to the dashboard's non-elevated SDK calls
 * and only switches to `auth.elevate` when a caller explicitly passes
 * `{ elevated: true }` — that flag must be set ONLY from backend call sites.
 * Dashboard callers must keep omitting it, exactly like `getAppEntitlement`
 * in `shared/entitlement`.
 */
export type ConfigurationCallOptions = { elevated?: boolean };

type ItemsQuery = typeof items.query;
type ItemsSave = typeof items.save;

function resolveItemsQuery(elevated: boolean): ItemsQuery {
  return elevated ? auth.elevate(items.query) : items.query;
}

function resolveItemsSave(elevated: boolean): ItemsSave {
  return elevated ? auth.elevate(items.save) : items.save;
}

export const COLLECTION_ID = '@krasalgim/giftcraft/giftcraft-options';
const APP_NAME = 'GiftCraft';

const REQUIREMENT = {
  id: COLLECTION_ID,
  displayField: 'title',
  fields: [
    { key: 'title', type: 'TEXT' },
    { key: 'payload', type: 'OBJECT' },
  ],
  dataPermissions: {
    itemRead: 'PRIVILEGED',
    itemInsert: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
  },
} as const;

/**
 * ROOT CAUSE FIX: this used to probe with `collections.getDataCollection`,
 * which requires `SCOPE.DC-DATA.DATA-COLLECTIONS-MANAGE` -- a scope
 * GiftCraft (like every app in this portfolio) does not hold, so the check
 * 403'd permanently. It now probes with `items.query(...).limit(1).find(...)`,
 * which only needs `SCOPE.DC-DATA.READ` (a scope this app already holds).
 * Trade-off: an `items.query` probe cannot see collection structure, so
 * schema/permission verification is no longer possible via this path --
 * `assessStorageRequirements` reports the collection as ready-but-unverified
 * (`shapeUnknown`) instead of faking a schema check. See
 * `packages/core/src/storage/probe.ts` for the full incident writeup.
 */
export async function assessConfigurationStorage({ elevated = false }: ConfigurationCallOptions = {}): Promise<StorageReadinessAssessment> {
  try {
    return await withStorageTimeout(() =>
      assessStorageRequirements(
        createItemsQueryReader(resolveItemsQuery(elevated)),
        APP_NAME,
        [REQUIREMENT],
      ));
  } catch (error) {
    if (error instanceof Error && error.message === 'STORAGE_CHECK_TIMEOUT') {
      return {
        ready: false,
        state: 'timeout',
        message: provisioningMessage(APP_NAME),
        details: 'Storage check timed out after 15 seconds.',
      };
    }
    return classifyStorageFailure(error, APP_NAME);
  }
}

export async function verifyConfigurationStorage(options: ConfigurationCallOptions = {}): Promise<boolean> {
  return (await assessConfigurationStorage(options)).ready;
}

import {
  DEFAULT_DRAIN_MAX_PAGES,
  DEFAULT_DRAIN_MAX_RECORDS,
  drainCursorPages as coreDrainCursorPages,
  type CursorPage,
} from '@wix-extensions/core/storage';

export const DRAIN_MAX_PAGES = DEFAULT_DRAIN_MAX_PAGES;
export const DRAIN_MAX_RECORDS = DEFAULT_DRAIN_MAX_RECORDS;

export type { CursorPage };
export interface DrainResult<T> {
  records: T[];
  capped: boolean;
}

/**
 * Fully drains a cursor-based query result delegating to @wix-extensions/core/storage.
 */
export async function drainCursorPages<T>(
  firstPage: CursorPage<T>,
  opts: { maxPages?: number; maxRecords?: number } = {},
): Promise<DrainResult<T>> {
  const res = await coreDrainCursorPages(firstPage, {
    maxPages: opts.maxPages ?? DRAIN_MAX_PAGES,
    maxRecords: opts.maxRecords ?? DRAIN_MAX_RECORDS,
  });
  return { records: res.records, capped: res.capped };
}

export async function loadConfiguration<T>({ elevated = false }: ConfigurationCallOptions = {}): Promise<T[]> {
  const firstPage = await resolveItemsQuery(elevated)(COLLECTION_ID).eq('_id', 'configuration').limit(100).find({ consistentRead: true });
  const { records, capped } = await drainCursorPages<{ payload?: { entries?: T[] } }>(firstPage as unknown as CursorPage<{ payload?: { entries?: T[] } }>);
  if (capped) {
    // The configuration item is a single document keyed by _id; capping here would only ever
    // indicate an unexpected number of matching documents, which is worth surfacing loudly.
    console.error('[GiftCraft] Configuration drain hit the safety cap while loading a single-document query.');
  }
  return (records[0]?.payload?.entries as T[] | undefined) ?? [];
}

export async function saveConfiguration<T>(entries: T[], { elevated = false }: ConfigurationCallOptions = {}): Promise<void> {
  await resolveItemsSave(elevated)(COLLECTION_ID, { _id: 'configuration', title: 'Configuration', payload: { entries } });
}

export async function initializeConfiguration(options: ConfigurationCallOptions = {}): Promise<void> {
  const readiness = await assessConfigurationStorage(options);
  if (!readiness.ready) {
    throw new Error(readiness.message);
  }
  await resolveItemsQuery(options.elevated ?? false)(COLLECTION_ID).eq('_id', 'configuration').find({ consistentRead: true });
}
