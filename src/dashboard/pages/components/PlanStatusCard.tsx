import React from 'react';
import { Box, SectionHelper, TextButton, Text } from '@wix/design-system';
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
 * Plan upsell banner. Renders NOTHING for a paid merchant with no issue to flag - a
 * standing "you're already on Pro" confirmation is pure noise once the plan is settled
 * (see workflows/03-dashboard-extensions-design-system.md on hiding empty optional
 * sections and avoiding repetitive banners). Paid-plan visibility instead lives in a
 * cheap header Badge (see page.tsx), since a badge costs no vertical space.
 *
 * For a free-plan merchant this keeps the Pro upsell, its CTA, and a support contact
 * link, since that combination is the one thing on this card a merchant can act on.
 */
export function PlanStatusCard({ entitlement, isEntitlementLoading, upgradeUrl, onUpgrade }: PlanStatusCardProps) {
  const intl = useIntl();
  const isPaid = canUsePaidFeatures(entitlement);

  if (isPaid) return null;

  const supportSubject = intl.formatMessage({ id: 'app.plan.supportSubject', defaultMessage: 'GiftCraft: Wrap & Cards support' });
  const unavailableNote = !upgradeUrl
    ? (isEntitlementLoading
        ? intl.formatMessage({ id: 'app.plan.loadingTooltip', defaultMessage: 'Plan details are still loading' })
        : intl.formatMessage({ id: 'app.plan.unavailableTooltip', defaultMessage: 'Plan details are unavailable right now' }))
    : undefined;

  return (
    <SectionHelper
      skin="premium"
      title={intl.formatMessage({ id: 'app.plan.basicTitle', defaultMessage: 'You\'re on the Basic (free) plan' })}
      actionText={intl.formatMessage({ id: 'app.common.upgradeToPro', defaultMessage: 'Upgrade to Pro' })}
      actionDisabled={!upgradeUrl}
      onAction={upgradeUrl ? onUpgrade : undefined}
    >
      <Box direction="vertical" gap="6px">
        <Text size="small">
          <FormattedMessage id="app.plan.basicBody" defaultMessage="Basic includes one gift-wrap option with a flat fee. Upgrade to Pro for multiple wrapping styles, greeting cards, and gift-with-purchase threshold rules." />
        </Text>
        {unavailableNote && <Text size="tiny" secondary>{unavailableNote}</Text>}
        <Box>
          <TextButton size="small" as="a" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(supportSubject)}`} target="_blank" rel="noopener noreferrer">
            <FormattedMessage id="app.plan.contactSupport" defaultMessage="Contact support" />
          </TextButton>
        </Box>
      </Box>
    </SectionHelper>
  );
}
