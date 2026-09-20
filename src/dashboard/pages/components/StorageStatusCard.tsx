import React from 'react';
import { Box, Card, Text } from '@wix/design-system';
import { FormattedMessage, useIntl } from 'react-intl';
import { StorageSetupNeeded } from '@wix-extensions/core';
import type { StorageSetupState } from '../../../shared/storage-readiness';

interface StorageStatusCardProps {
  storageReady: boolean;
  storageState: StorageSetupState | null;
  storageErrorDetails?: string;
  storageRequestId?: string;
  busy: boolean;
  onRetry: () => void;
}

function recoveryTitleId(state: StorageSetupState | null): string {
  switch (state) {
    case 'provisioning':
    case 'timeout':
      return 'app.storage.recoveryTitleProvisioning';
    case 'permission':
    case 'permission_denied':
      return 'app.storage.recoveryTitlePermission';
    case 'cms_required':
      return 'app.storage.recoveryTitleCmsRequired';
    default:
      return 'app.storage.recoveryTitleDefault';
  }
}

function recoveryBodyId(state: StorageSetupState | null): { id: string; defaultMessage: string } {
  switch (state) {
    case 'provisioning':
    case 'timeout':
    case 'schema_mismatch':
      return { id: 'app.storage.provisioningMessage', defaultMessage: 'GiftCraft is still provisioning private storage after install or update. This usually finishes within five minutes — click "Check again" or keep this page open.' };
    case 'permission':
    case 'permission_denied':
      // permission_denied (core's classifyStorageFailure state for a 401/403 on the
      // collection) is the same "grant access" recovery as the legacy 'permission'
      // state, and core's storageAccessBlockedMessage copy already matches this
      // catalog string verbatim, so it reuses the same message IDs rather than a
      // duplicate translation across all 9 locales.
      return { id: 'app.storage.permissionMessage', defaultMessage: 'GiftCraft needs storage permissions on this site. Open Manage Apps, choose Complete Setup for this app, approve access, then return here and click Retry.' };
    case 'cms_required':
      return { id: 'app.storage.cmsRequiredMessage', defaultMessage: 'Add Wix CMS to this site, update this app to the latest version, then click Retry.' };
    default:
      return { id: 'app.storage.genericError', defaultMessage: 'We could not confirm storage is set up. Keep this page open and try again, or contact support if this continues.' };
  }
}

/**
 * Explains whether GiftCraft's private storage is ready. On first load the dashboard
 * auto-verifies (with short polling while Wix propagates collections). Retry re-runs
 * the same check — there is no separate merchant action that creates collections.
 *
 * Thin mapping layer: all layout/severity/details-toggle/request-ID rendering lives in
 * core's <StorageSetupNeeded/>; this component only owns GiftCraft's copy and the
 * Card-wrapping + pre-classification "checking" card that core's inline variant doesn't
 * itself provide.
 */
export function StorageStatusCard({
  storageReady,
  storageState,
  storageErrorDetails,
  storageRequestId,
  busy,
  onRetry,
}: StorageStatusCardProps) {
  const intl = useIntl();
  const isRecovering = storageState === 'provisioning' || storageState === 'timeout';
  const showErrorCard = !storageReady && !!storageState && storageState !== 'ready';
  const bodyMessage = recoveryBodyId(storageState);

  return (
    <Box direction="vertical" gap="16px">
      {showErrorCard && (
        <Card>
          <Card.Content>
            <StorageSetupNeeded
              state={storageState as StorageSetupState}
              title={intl.formatMessage({ id: recoveryTitleId(storageState), defaultMessage: 'Setup needed before you can save gift options' })}
              subtitle={<FormattedMessage id={bodyMessage.id} defaultMessage={bodyMessage.defaultMessage} />}
              details={storageErrorDetails}
              requestId={storageRequestId}
              requestIdLabel={<FormattedMessage id="app.storage.requestIdPrefix" defaultMessage="Wix request ID:" />}
              detailsShowLabel={<FormattedMessage id="app.storage.showDetails" defaultMessage="Details for support" />}
              detailsHideLabel={<FormattedMessage id="app.storage.hideDetails" defaultMessage="Hide details for support" />}
              isChecking={busy}
              onRetry={onRetry}
              retryLabel={
                isRecovering
                  ? <FormattedMessage id="app.storage.checkAgain" defaultMessage="Check again" />
                  : <FormattedMessage id="app.common.retry" defaultMessage="Retry" />
              }
            />
          </Card.Content>
        </Card>
      )}

      {!storageReady && !showErrorCard && busy && (
        <Card>
          <Card.Content>
            <Text secondary size="small"><FormattedMessage id="app.storage.checkingSetup" defaultMessage="Checking whether your storage is set up…" /></Text>
          </Card.Content>
        </Card>
      )}
    </Box>
  );
}
