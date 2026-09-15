import React from 'react';
import { Badge, Box, Button, Card, Divider, FormField, Heading, Input, SectionHelper, Text, ToggleSwitch } from '@wix/design-system';
import { FormattedMessage, IntlShape, useIntl } from 'react-intl';
import { CheckoutLineItem, GiftEvaluationDetail, GiftEvaluationResult, GiftOption } from '../../../types';

/**
 * Maps a structured (translation-ready) evaluation detail from the shared gift-engine
 * helper to a localized sentence. The engine never bakes English text or currency
 * symbols into `appliedDetails` - only stable codes and raw values - so this is the
 * single place that turns them into merchant-facing copy.
 */
function formatEvaluationDetail(intl: IntlShape, detail: GiftEvaluationDetail, formatCurrency: (value: number) => string): string {
  switch (detail.code) {
    case 'NO_OPTION_SELECTED':
      return intl.formatMessage({ id: 'app.preview.detail.noOptionSelected', defaultMessage: 'No gift wrapping option selected or available.' });
    case 'OPTION_UNAVAILABLE':
      return intl.formatMessage({ id: 'app.preview.detail.optionUnavailable', defaultMessage: 'Selected gift option is disabled or does not exist.' });
    case 'FREE_WRAP_APPLIED':
      return intl.formatMessage(
        { id: 'app.preview.detail.freeWrapApplied', defaultMessage: 'Complimentary gift wrapping: cart subtotal {subtotal} reached the free threshold of {threshold}.' },
        { subtotal: formatCurrency(detail.values.subtotal), threshold: formatCurrency(detail.values.threshold) }
      );
    case 'WRAP_FEE_APPLIED':
      return intl.formatMessage(
        { id: 'app.preview.detail.wrapFeeApplied', defaultMessage: 'Gift wrapping ({name}): {fee}.' },
        { name: detail.values.name, fee: formatCurrency(detail.values.fee) }
      );
    case 'FREE_CARD_APPLIED':
      return intl.formatMessage(
        { id: 'app.preview.detail.freeCardApplied', defaultMessage: 'Complimentary greeting card: cart subtotal reached the free-card threshold of {threshold}.' },
        { threshold: formatCurrency(detail.values.threshold) }
      );
    case 'CARD_FEE_APPLIED':
      return intl.formatMessage(
        { id: 'app.preview.detail.cardFeeApplied', defaultMessage: 'Personalized greeting card: {fee} (spend {threshold} for a free card).' },
        { fee: formatCurrency(detail.values.fee), threshold: formatCurrency(detail.values.threshold) }
      );
    case 'CARD_INCLUDED':
      return intl.formatMessage({ id: 'app.preview.detail.cardIncluded', defaultMessage: 'Personalized greeting card included.' });
    case 'GIFT_WITH_PURCHASE_UNLOCKED':
      return intl.formatMessage(
        { id: 'app.preview.detail.giftWithPurchaseUnlocked', defaultMessage: 'Bonus gift unlocked: {giftName}.' },
        { giftName: detail.values.giftName }
      );
  }
}

interface CheckoutPreviewCardProps {
  isPaid: boolean;
  simItems: CheckoutLineItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onAddItem: () => void;
  enabledOptions: GiftOption[];
  selectedOptionId: string;
  onSelectOption: (id: string) => void;
  includeGreetingCard: boolean;
  onToggleGreetingCard: () => void;
  greetingMessage: string;
  onGreetingMessageChange: (value: string) => void;
  currentOption: GiftOption | undefined;
  charValidation: { valid: boolean; currentLength: number; limit: number };
  simSubtotal: number;
  simResult: GiftEvaluationResult;
}

export function CheckoutPreviewCard({
  isPaid,
  simItems,
  onUpdateQuantity,
  onAddItem,
  enabledOptions,
  selectedOptionId,
  onSelectOption,
  includeGreetingCard,
  onToggleGreetingCard,
  greetingMessage,
  onGreetingMessageChange,
  currentOption,
  charValidation,
  simSubtotal,
  simResult,
}: CheckoutPreviewCardProps) {
  const intl = useIntl();
  const formatCurrency = (value: number) => intl.formatNumber(value, { style: 'currency', currency: 'USD' });

  return (
    <Card>
      <Card.Header
        title={intl.formatMessage({ id: 'app.preview.title', defaultMessage: 'Option preview' })}
        subtitle={intl.formatMessage({ id: 'app.preview.subtitle', defaultMessage: 'Preview how a configured option would calculate with sample cart values. This does not replace a shopper checkout test.' })}
        suffix={
          <Button size="small" priority="secondary" onClick={onAddItem}>
            <FormattedMessage id="app.preview.addDemoItem" defaultMessage="+ Add demo cart item" />
          </Button>
        }
      />
      <Card.Content>
        <Box gap="24px">
          <Box direction="vertical" gap="16px" width="60%">
            <Heading size="small"><FormattedMessage id="app.preview.step1Heading" defaultMessage="1. Shopper cart items" /></Heading>
            {simItems.map((item, idx) => (
              <Box
                key={item.id}
                align="space-between"
                verticalAlign="middle"
                padding="12px"
                backgroundColor="D70"
                borderRadius="8px"
              >
                <Box direction="vertical" gap="2px">
                  <Text weight="bold">{item.productName}</Text>
                  <Text secondary size="small">
                    <FormattedMessage id="app.preview.priceEach" defaultMessage="{price} each" values={{ price: formatCurrency(Number(item.price)) }} />
                  </Text>
                  {item.tags && item.tags.length > 0 && (
                    <Text size="tiny" skin="premium">
                      <FormattedMessage id="app.preview.tags" defaultMessage="Tags: {tags}" values={{ tags: item.tags.join(', ') }} />
                    </Text>
                  )}
                </Box>
                <Box verticalAlign="middle" gap="8px">
                  <Button size="small" priority="secondary" onClick={() => onUpdateQuantity(idx, item.quantity - 1)}>-</Button>
                  <Text weight="bold">{item.quantity}</Text>
                  <Button size="small" priority="secondary" onClick={() => onUpdateQuantity(idx, item.quantity + 1)}>+</Button>
                  <Box width="70px" align="right">
                    <Text weight="bold">{formatCurrency(Number(item.price) * item.quantity)}</Text>
                  </Box>
                </Box>
              </Box>
            ))}

            <Divider />

            <Heading size="small"><FormattedMessage id="app.preview.step2Heading" defaultMessage="2. Gift-wrap option selection" /></Heading>
            {enabledOptions.length === 0 ? (
              <Text size="small" secondary><FormattedMessage id="app.preview.noOptionsHint" defaultMessage="Add a gift-wrap option above to preview checkout fees." /></Text>
            ) : (
              <Box gap="8px" flexWrap="wrap">
                {enabledOptions.map(option => (
                  <Button
                    key={option.id}
                    size="small"
                    priority={selectedOptionId === option.id ? 'primary' : 'secondary'}
                    onClick={() => onSelectOption(option.id)}
                  >
                    {intl.formatMessage({ id: 'app.preview.optionButtonLabel', defaultMessage: '{name} ({price})' }, { name: option.name, price: formatCurrency(option.price) })}
                  </Button>
                ))}
              </Box>
            )}

            <Divider />

            <Heading size="small"><FormattedMessage id="app.preview.step3Heading" defaultMessage="3. Personalized greeting message" /></Heading>
            {!isPaid ? (
              <SectionHelper skin="premium" title={<FormattedMessage id="app.preview.proFeatureTitle" defaultMessage="Greeting cards are a Pro feature" />}>
                <FormattedMessage id="app.preview.proFeatureBody" defaultMessage="Upgrade to Pro to let shoppers add a personalized greeting card at checkout." />
              </SectionHelper>
            ) : (
              <>
                <Box verticalAlign="middle" gap="12px">
                  <ToggleSwitch checked={includeGreetingCard} onChange={onToggleGreetingCard} />
                  <Text weight="bold"><FormattedMessage id="app.preview.includeCardLabel" defaultMessage="Include printed greeting card" /></Text>
                </Box>

                {includeGreetingCard && (
                  <Box direction="vertical" gap="8px">
                    <FormField label={intl.formatMessage({ id: 'app.preview.messageFieldLabel', defaultMessage: 'Greeting card message (max {limit} characters)' }, { limit: currentOption?.characterLimit || 200 })}>
                      <Input
                        value={greetingMessage}
                        onChange={(e: any) => onGreetingMessageChange(e.target.value)}
                        placeholder={intl.formatMessage({ id: 'app.preview.messagePlaceholder', defaultMessage: 'Write your personal gift message here...' })}
                      />
                    </FormField>
                    <Box align="space-between" verticalAlign="middle">
                      <Text size="tiny" secondary>
                        <FormattedMessage id="app.preview.charactersCount" defaultMessage="Characters: {current} / {limit}" values={{ current: charValidation.currentLength, limit: charValidation.limit }} />
                      </Text>
                      <Badge skin={charValidation.valid ? 'success' : 'danger'}>
                        {charValidation.valid
                          ? <FormattedMessage id="app.preview.withinLimit" defaultMessage="Within limit" />
                          : <FormattedMessage id="app.preview.exceedsLimit" defaultMessage="Exceeds limit" />}
                      </Badge>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>

          <Box direction="vertical" gap="14px" width="40%" backgroundColor="D70" padding="20px" borderRadius="8px">
            <Heading size="small"><FormattedMessage id="app.preview.summaryHeading" defaultMessage="Checkout order summary preview" /></Heading>
            <Divider />

            <Box align="space-between">
              <Text><FormattedMessage id="app.preview.cartSubtotal" defaultMessage="Cart subtotal:" /></Text>
              <Text weight="bold">{formatCurrency(simSubtotal)}</Text>
            </Box>

            {currentOption?.freeThreshold && (
              <SectionHelper
                skin={simSubtotal >= currentOption.freeThreshold ? 'success' : 'standard'}
                size="small"
              >
                {simSubtotal >= currentOption.freeThreshold
                  ? <FormattedMessage id="app.preview.freeWrapUnlocked" defaultMessage="Free gift wrapping unlocked!" />
                  : <FormattedMessage id="app.preview.addMoreForFree" defaultMessage="Add {amount} more for free wrapping" values={{ amount: formatCurrency(currentOption.freeThreshold - simSubtotal) }} />}
              </SectionHelper>
            )}

            {simResult.isGiftWithPurchaseUnlocked && simResult.giftWithPurchaseItem && (
              <SectionHelper skin="warning" size="small" title={<FormattedMessage id="app.preview.qualifiedGift" defaultMessage="Qualified for free gift" />}>
                {simResult.giftWithPurchaseItem}
              </SectionHelper>
            )}

            <Divider />

            <Box align="space-between">
              <Text>
                {currentOption
                  ? <FormattedMessage id="app.preview.giftWrappingLabelNamed" defaultMessage="Gift wrapping ({name}):" values={{ name: currentOption.name }} />
                  : <FormattedMessage id="app.preview.giftWrappingLabelPlain" defaultMessage="Gift wrapping:" />}
              </Text>
              <Text weight="bold" skin={simResult.wrapFee === 0 ? 'success' : 'standard'}>
                {simResult.wrapFee === 0 ? <FormattedMessage id="app.preview.free" defaultMessage="Free" /> : formatCurrency(simResult.wrapFee)}
              </Text>
            </Box>

            {includeGreetingCard && isPaid && (
              <Box align="space-between">
                <Text><FormattedMessage id="app.preview.greetingCardLabel" defaultMessage="Personalized greeting card:" /></Text>
                <Text weight="bold" skin={simResult.cardFee === 0 ? 'success' : 'standard'}>
                  {simResult.cardFee === 0 ? <FormattedMessage id="app.preview.free" defaultMessage="Free" /> : formatCurrency(simResult.cardFee)}
                </Text>
              </Box>
            )}

            <Divider />

            <Box align="space-between">
              <Heading size="small"><FormattedMessage id="app.preview.totalFeesLabel" defaultMessage="Total additional fees:" /></Heading>
              <Text weight="bold" size="medium" skin={simResult.totalFee > 0 ? 'error' : 'success'}>
                {formatCurrency(simResult.totalFee)}
              </Text>
            </Box>

            <Box align="space-between">
              <Heading size="medium"><FormattedMessage id="app.preview.estimatedTotalLabel" defaultMessage="Estimated checkout total:" /></Heading>
              <Heading size="medium">{formatCurrency(simSubtotal + simResult.totalFee)}</Heading>
            </Box>

            <Box direction="vertical" gap="4px" marginTop="8px">
              <Text size="tiny" secondary weight="bold"><FormattedMessage id="app.preview.evaluationDetailsLabel" defaultMessage="Evaluation details:" /></Text>
              {simResult.appliedDetails.map((detail, idx) => (
                <Text key={idx} size="tiny" secondary>• {formatEvaluationDetail(intl, detail, formatCurrency)}</Text>
              ))}
            </Box>
          </Box>
        </Box>
      </Card.Content>
    </Card>
  );
}
