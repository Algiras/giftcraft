import { collections, items, permissions } from '@wix/data';
import {
  classifyStorageFailure,
  provisioningMessage,
  type StorageReadinessAssessment,
  withStorageTimeout,
} from './storage-readiness';

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

function hasRequiredShape(collection: { _id?: string; displayField?: string | null; fields?: Array<{ key?: string; type?: string }> }): boolean {
  const fields = collection.fields ?? [];
  return collection._id === REQUIREMENT.id
    && collection.displayField === REQUIREMENT.displayField
    && REQUIREMENT.fields.every(required => fields.some(field => field.key === required.key && field.type === required.type));
}

function hasPrivilegedAccess(dataPermissions: Record<string, string> | undefined): boolean {
  return Object.entries(REQUIREMENT.dataPermissions).every(([action, role]) => dataPermissions?.[action] === role);
}

export async function assessConfigurationStorage(): Promise<StorageReadinessAssessment> {
  try {
    return await withStorageTimeout(async () => {
      const collection = await collections.getDataCollection(COLLECTION_ID, { consistentRead: true });
      const dataPermissions = await permissions.getPermissions(COLLECTION_ID) as Record<string, string>;
      if (!hasRequiredShape(collection)) {
        return {
          ready: false,
          state: 'schema_mismatch',
          message: provisioningMessage(APP_NAME),
          details: `Collection ${COLLECTION_ID} does not match the required schema.`,
        };
      }
      if (!hasPrivilegedAccess(dataPermissions)) {
        return classifyStorageFailure(new Error('403 Forbidden'), APP_NAME);
      }
      return { ready: true, state: 'ready', message: '' };
    });
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

export async function loadConfiguration<T>(): Promise<T[]> {
  const result = await items.query(COLLECTION_ID).eq('_id', 'configuration').find({ consistentRead: true });
  return (result.items[0]?.payload?.entries as T[] | undefined) ?? [];
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
