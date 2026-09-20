import { collections, items } from '@wix/data';
import {
  assessStorageRequirements,
  classifyStorageFailure,
  provisioningMessage,
  type StorageReadinessAssessment,
  withStorageTimeout,
} from '@wix-extensions/core/storage';

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

export async function assessConfigurationStorage(): Promise<StorageReadinessAssessment> {
  try {
    return await withStorageTimeout(() =>
      assessStorageRequirements(
        (id: string) => collections.getDataCollection(id, { consistentRead: true }),
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

export async function verifyConfigurationStorage(): Promise<boolean> {
  return (await assessConfigurationStorage()).ready;
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

export async function loadConfiguration<T>(): Promise<T[]> {
  const firstPage = await items.query(COLLECTION_ID).eq('_id', 'configuration').limit(100).find({ consistentRead: true });
  const { records, capped } = await drainCursorPages<{ payload?: { entries?: T[] } }>(firstPage as unknown as CursorPage<{ payload?: { entries?: T[] } }>);
  if (capped) {
    // The configuration item is a single document keyed by _id; capping here would only ever
    // indicate an unexpected number of matching documents, which is worth surfacing loudly.
    console.error('[GiftCraft] Configuration drain hit the safety cap while loading a single-document query.');
  }
  return (records[0]?.payload?.entries as T[] | undefined) ?? [];
}

export async function saveConfiguration<T>(entries: T[]): Promise<void> {
  await items.save(COLLECTION_ID, { _id: 'configuration', title: 'Configuration', payload: { entries } });
}

export async function initializeConfiguration(): Promise<void> {
  const readiness = await assessConfigurationStorage();
  if (!readiness.ready) {
    throw new Error(readiness.message);
  }
  await items.query(COLLECTION_ID).eq('_id', 'configuration').find({ consistentRead: true });
}
