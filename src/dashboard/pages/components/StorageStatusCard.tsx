import React, { useState } from 'react';
import { Box, Button, Card, SectionHelper, Text, TextButton } from '@wix/design-system';
import type { StorageSetupState } from '../../../shared/storage-readiness';

interface StorageStatusCardProps {
  storageReady: boolean;
  storageError: string | null;
  storageErrorDetails?: string;
  storageState: StorageSetupState | null;
  busy: boolean;
  onRetry: () => void;
}

function recoveryTitle(state: StorageSetupState | null): string {
  switch (state) {
    case 'provisioning':
    case 'timeout':
      return 'Storage is still setting up';
    case 'permission':
      return 'App permissions needed';
    case 'cms_required':
      return 'Wix CMS required on this site';
    default:
      return 'Setup needed before you can save gift options';
  }
}

/**
 * Explains whether GiftCraft's private storage is ready. On first load the dashboard
 * auto-verifies (with short polling while Wix propagates collections). Retry re-runs
 * the same check — there is no separate merchant action that creates collections.
 */
export function StorageStatusCard({
  storageReady,
  storageError,
  storageErrorDetails,
  storageState,
  busy,
  onRetry,
}: StorageStatusCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const retryLabel = storageState === 'provisioning' || storageState === 'timeout' ? 'Check again' : 'Retry';

  return (
    <Box direction="vertical" gap="16px">
      {storageError && (
        <Card>
          <Card.Content>
            <Box direction="vertical" gap="8px">
              <SectionHelper skin="warning" title={recoveryTitle(storageState)}>
                {storageError}
              </SectionHelper>
              {storageErrorDetails && (
                <Box direction="vertical" gap="2px">
                  <TextButton size="tiny" onClick={() => setShowDetails(!showDetails)}>
                    {showDetails ? 'Hide details for support' : 'Details for support'}
                  </TextButton>
                  {showDetails && <Text size="tiny" secondary>{storageErrorDetails}</Text>}
                </Box>
              )}
              <Box gap="8px">
                <Button priority="secondary" size="small" disabled={busy} onClick={onRetry}>
                  {retryLabel}
                </Button>
              </Box>
            </Box>
          </Card.Content>
        </Card>
      )}

      {!storageReady && !storageError && busy && (
        <Card>
          <Card.Content>
            <Text secondary size="small">Checking whether your storage is set up…</Text>
          </Card.Content>
        </Card>
      )}
    </Box>
  );
}
