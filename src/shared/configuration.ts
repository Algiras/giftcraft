import { collections, items } from '@wix/data';
import { auth } from '@wix/essentials';
import {
  assessStorageRequirements,
  classifyStorageFailure,
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

type GetDataCollection = typeof collections.getDataCollection;
type ItemsQuery = typeof items.query;
type ItemsSave = typeof items.save;

function resolveGetDataCollection(elevated: boolean): GetDataCollection {
  return elevated ? auth.elevate(collections.getDataCollection) : collections.getDataCollection;
}

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

export async function assessConfigurationStorage({ elevated = false }: ConfigurationCallOptions = {}): Promise<StorageReadinessAssessment> {
  try {
    const getDataCollection = resolveGetDataCollection(elevated);
    return await withStorageTimeout(() =>
      assessStorageRequirements(
        (id: string) => getDataCollection(id, { consistentRead: true }),
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

/**
 * Minimal shape of the SDK's CursorBasedIterator (@wix/sdk-runtime query-iterators.d.ts)
 * that the drain loop below relies on. Only `items`/`hasNext`/`next` are used —
 * offset-style members (currentPage/totalPages/totalCount) must never appear here.
 */
export interface CursorPage<T> {
  items: T[];
  hasNext(): boolean;
  next(): Promise<CursorPage<T>>;
}

/** Hard safety cap for draining a cursor-based query fully into memory. */
export const DRAIN_MAX_PAGES = 20;
export const DRAIN_MAX_RECORDS = 1000;

export interface DrainResult<T> {
  records: T[];
  /** True when the drain stopped early because it hit the page or record cap, not because the collection ended. */
  capped: boolean;
}

/**
 * Fully drains a cursor-based query result (hasNext()/next()), for collections that are
 * known to be bounded merchant configuration rather than user-facing unbounded data.
 * Stops after `maxPages` pages or `maxRecords` records so a runaway collection can never
 * hang the caller — never introduces offset/skip paging.
 */
export async function drainCursorPages<T>(
  firstPage: CursorPage<T>,
  { maxPages = DRAIN_MAX_PAGES, maxRecords = DRAIN_MAX_RECORDS }: { maxPages?: number; maxRecords?: number } = {}
): Promise<DrainResult<T>> {
  let page = firstPage;
  let records: T[] = [...page.items];
  let pagesRead = 1;
  let capped = false;

  while (page.hasNext()) {
    if (pagesRead >= maxPages || records.length >= maxRecords) {
      capped = true;
      break;
    }
    page = await page.next();
    records = records.concat(page.items);
    pagesRead += 1;
  }

  if (records.length > maxRecords) {
    records = records.slice(0, maxRecords);
    capped = true;
  }

  return { records, capped };
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
