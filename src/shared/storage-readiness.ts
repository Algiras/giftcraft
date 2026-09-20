export type {
  StorageState,
  StorageState as StorageSetupState,
  StorageReadinessAssessment,
  StorageCheckItem,
  StorageFieldRequirement,
  StorageCollectionRequirement,
} from '@wix-extensions/core';

export {
  assessStorageRequirements,
  classifyStorageFailure,
  confirmStorageWithAutoRetry,
  errorDetail,
  extractRequestId,
  isCollectionMissing,
  isPermissionDenied,
  isCmsMissing,
  withStorageTimeout,
  appendRequestId,
} from '@wix-extensions/core';

export function provisioningMessage(appName: string): string {
  return `${appName} is still provisioning private storage after install or update. This usually finishes within five minutes — click Check again or keep this page open.`;
}

export function permissionMessage(appName: string): string {
  return `${appName} needs storage permissions on this site. Open Manage Apps, choose Complete Setup for this app, approve access, then return here and click Retry.`;
}

export function cmsRequiredMessage(): string {
  return 'Add Wix CMS to this site, update this app to the latest version, then click Retry.';
}
