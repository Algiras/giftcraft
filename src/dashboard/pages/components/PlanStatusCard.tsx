import React from 'react';
import { Box, Button, Card, SectionHelper, Tooltip, TextButton } from '@wix/design-system';
import { FormattedMessage, useIntl } from 'react-intl';
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
  const intl = useIntl();
  const isPaid = canUsePaidFeatures(entitlement);
  const supportSubject = intl.formatMessage({ id: 'app.plan.supportSubject', defaultMessage: 'GiftCraft: Wrap & Cards support' });

  return (
    <Card>
      <Card.Header title={<FormattedMessage id="app.plan.title" defaultMessage="Plan & availability" />} />
      <Card.Content>
        <Box direction="vertical" gap="12px">
          {isPaid ? (
            <SectionHelper skin="success" title={<FormattedMessage id="app.plan.proActiveTitle" defaultMessage="Pro plan active" />}>
              <FormattedMessage id="app.plan.proActiveBody" defaultMessage="Multiple wrap styles, greeting cards, and gift-with-purchase rules are unlocked for this site." />
            </SectionHelper>
          ) : (
            <SectionHelper skin="premium" title={<FormattedMessage id="app.plan.basicTitle" defaultMessage="You're on the Basic (free) plan" />}>
              <FormattedMessage id="app.plan.basicBody" defaultMessage="Basic includes one gift-wrap option with a flat fee. Upgrade to Pro for multiple wrapping styles, greeting cards, and gift-with-purchase threshold rules." />
            </SectionHelper>
          )}
          <Box align="space-between" verticalAlign="middle" gap="12px">
            <TextButton size="small" as="a" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(supportSubject)}`}>
              <FormattedMessage id="app.plan.contactSupport" defaultMessage="Contact support" />
            </TextButton>
            {!isPaid && (
              upgradeUrl ? (
                <Button size="small" priority="secondary" skin="premium" onClick={onUpgrade}>
                  <FormattedMessage id="app.common.upgradeToPro" defaultMessage="Upgrade to Pro" />
                </Button>
              ) : (
                <Tooltip content={isEntitlementLoading
                  ? intl.formatMessage({ id: 'app.plan.loadingTooltip', defaultMessage: 'Plan details are still loading' })
                  : intl.formatMessage({ id: 'app.plan.unavailableTooltip', defaultMessage: 'Plan details are unavailable right now' })}>
                  <Button size="small" priority="secondary" skin="premium" disabled>
                    <FormattedMessage id="app.common.upgradeToPro" defaultMessage="Upgrade to Pro" />
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
