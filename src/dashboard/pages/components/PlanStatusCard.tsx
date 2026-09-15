import React from 'react';
import { Box, Button, Card, SectionHelper, Tooltip, TextButton } from '@wix/design-system';
import { AppEntitlement, canUsePaidFeatures } from '../../../shared/entitlement';

const SUPPORT_EMAIL = 'kras.algim@gmail.com';

interface PlanStatusCardProps {
  entitlement: AppEntitlement;
  isEntitlementLoading: boolean;
  upgradeUrl: string | undefined;
  onUpgrade: () => void;
}

/**
 * Plan & availability card: shows the merchant's live plan (paid via the Wix app
 * instance, never a saved flag), the Pro upgrade CTA, and a support contact link.
 */
export function PlanStatusCard({ entitlement, isEntitlementLoading, upgradeUrl, onUpgrade }: PlanStatusCardProps) {
  const isPaid = canUsePaidFeatures(entitlement);

  return (
    <Card>
      <Card.Header title="Plan & availability" />
      <Card.Content>
        <Box direction="vertical" gap="12px">
          {isPaid ? (
            <SectionHelper skin="success" title="Pro plan active">
              Multiple wrap styles, greeting cards, and gift-with-purchase rules are unlocked for this site.
            </SectionHelper>
          ) : (
            <SectionHelper skin="premium" title="You're on the Basic (free) plan">
              Basic includes one gift-wrap option with a flat fee. Upgrade to Pro for multiple wrapping styles,
              greeting cards, and gift-with-purchase threshold rules.
            </SectionHelper>
          )}
          <Box align="space-between" verticalAlign="middle" gap="12px">
            <TextButton size="small" as="a" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('GiftCraft: Wrap & Cards support')}`}>
              Contact support
            </TextButton>
            {!isPaid && (
              upgradeUrl ? (
                <Button size="small" priority="secondary" skin="premium" onClick={onUpgrade}>
                  Upgrade to Pro
                </Button>
              ) : (
                <Tooltip content={isEntitlementLoading ? 'Plan details are still loading' : 'Plan details are unavailable right now'}>
                  <Button size="small" priority="secondary" skin="premium" disabled>
                    Upgrade to Pro
                  </Button>
                </Tooltip>
              )
            )}
          </Box>
        </Box>
      </Card.Content>
    </Card>
  );
}
