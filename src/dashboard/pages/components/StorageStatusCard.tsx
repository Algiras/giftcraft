import React, { useState } from 'react';
import { Box, Button, Card, SectionHelper, Text, TextButton } from '@wix/design-system';
import { FormattedMessage, useIntl } from 'react-intl';
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
  const [showDetails, setShowDetails] = useState(false);
  const isRecovering = storageState === 'provisioning' || storageState === 'timeout';
  const showErrorCard = !storageReady && !!storageState && storageState !== 'ready';
  const bodyMessage = recoveryBodyId(storageState);
  const detailsForSupport = [storageErrorDetails, storageRequestId ? intl.formatMessage({ id: 'app.storage.requestIdLabel', defaultMessage: 'Wix request ID: {requestId}' }, { requestId: storageRequestId }) : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <Box direction="vertical" gap="16px">
      {showErrorCard && (
        <Card>
          <Card.Content>
            <Box direction="vertical" gap="8px">
              <SectionHelper skin="warning" title={intl.formatMessage({ id: recoveryTitleId(storageState), defaultMessage: 'Setup needed before you can save gift options' })}>
                <FormattedMessage id={bodyMessage.id} defaultMessage={bodyMessage.defaultMessage} />
              </SectionHelper>
              {detailsForSupport && (
                <Box direction="vertical" gap="2px">
                  <TextButton size="tiny" onClick={() => setShowDetails(!showDetails)}>
                    {showDetails
                      ? <FormattedMessage id="app.storage.hideDetails" defaultMessage="Hide details for support" />
                      : <FormattedMessage id="app.storage.showDetails" defaultMessage="Details for support" />}
                  </TextButton>
                  {showDetails && <Text size="tiny" secondary>{detailsForSupport}</Text>}
                </Box>
              )}
              <Box gap="8px">
                <Button priority="secondary" size="small" disabled={busy} onClick={onRetry}>
                  {isRecovering
                    ? <FormattedMessage id="app.storage.checkAgain" defaultMessage="Check again" />
                    : <FormattedMessage id="app.common.retry" defaultMessage="Retry" />}
                </Button>
              </Box>
            </Box>
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
