import React from 'react';
import { Badge, Box, Button, Card, Divider, FormField, Heading, Input, SectionHelper, Text, ToggleSwitch } from '@wix/design-system';
import { CheckoutLineItem, GiftEvaluationResult, GiftOption } from '../../../types';

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
  return (
    <Card>
      <Card.Header
        title="Option preview"
        subtitle="Preview how a configured option would calculate with sample cart values. This does not replace a shopper checkout test."
        suffix={
          <Button size="small" priority="secondary" onClick={onAddItem}>
            + Add demo cart item
          </Button>
        }
      />
      <Card.Content>
        <Box gap="24px">
          <Box direction="vertical" gap="16px" width="60%">
            <Heading size="small">1. Shopper cart items</Heading>
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
                  <Text secondary size="small">${Number(item.price).toFixed(2)} each</Text>
                  {item.tags && item.tags.length > 0 && (
                    <Text size="tiny" skin="premium">Tags: {item.tags.join(', ')}</Text>
                  )}
                </Box>
                <Box verticalAlign="middle" gap="8px">
                  <Button size="small" priority="secondary" onClick={() => onUpdateQuantity(idx, item.quantity - 1)}>-</Button>
                  <Text weight="bold">{item.quantity}</Text>
                  <Button size="small" priority="secondary" onClick={() => onUpdateQuantity(idx, item.quantity + 1)}>+</Button>
                  <Box width="70px" align="right">
                    <Text weight="bold">${(Number(item.price) * item.quantity).toFixed(2)}</Text>
                  </Box>
                </Box>
              </Box>
            ))}

            <Divider />

            <Heading size="small">2. Gift-wrap option selection</Heading>
            {enabledOptions.length === 0 ? (
              <Text size="small" secondary>Add a gift-wrap option above to preview checkout fees.</Text>
            ) : (
              <Box gap="8px" flexWrap="wrap">
                {enabledOptions.map(option => (
                  <Button
                    key={option.id}
                    size="small"
                    priority={selectedOptionId === option.id ? 'primary' : 'secondary'}
                    onClick={() => onSelectOption(option.id)}
                  >
                    {option.name} (${option.price.toFixed(2)})
                  </Button>
                ))}
              </Box>
            )}

            <Divider />

            <Heading size="small">3. Personalized greeting message</Heading>
            {!isPaid ? (
              <SectionHelper skin="premium" title="Greeting cards are a Pro feature">
                Upgrade to Pro to let shoppers add a personalized greeting card at checkout.
              </SectionHelper>
            ) : (
              <>
                <Box verticalAlign="middle" gap="12px">
                  <ToggleSwitch checked={includeGreetingCard} onChange={onToggleGreetingCard} />
                  <Text weight="bold">Include printed greeting card</Text>
                </Box>

                {includeGreetingCard && (
                  <Box direction="vertical" gap="8px">
                    <FormField label={`Greeting card message (max ${currentOption?.characterLimit || 200} characters)`}>
                      <Input
                        value={greetingMessage}
                        onChange={(e: any) => onGreetingMessageChange(e.target.value)}
                        placeholder="Write your personal gift message here..."
                      />
                    </FormField>
                    <Box align="space-between" verticalAlign="middle">
                      <Text size="tiny" secondary>
                        Characters: {charValidation.currentLength} / {charValidation.limit}
                      </Text>
                      <Badge skin={charValidation.valid ? 'success' : 'danger'}>
                        {charValidation.valid ? 'Within limit' : 'Exceeds limit'}
                      </Badge>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>

          <Box direction="vertical" gap="14px" width="40%" backgroundColor="D70" padding="20px" borderRadius="8px">
            <Heading size="small">Checkout order summary preview</Heading>
            <Divider />

            <Box align="space-between">
              <Text>Cart subtotal:</Text>
              <Text weight="bold">${simSubtotal.toFixed(2)}</Text>
            </Box>

            {currentOption?.freeThreshold && (
              <SectionHelper
                skin={simSubtotal >= currentOption.freeThreshold ? 'success' : 'standard'}
                size="small"
              >
                {simSubtotal >= currentOption.freeThreshold
                  ? 'Free gift wrapping unlocked!'
                  : `Add $${(currentOption.freeThreshold - simSubtotal).toFixed(2)} more for free wrapping`}
              </SectionHelper>
            )}

            {simResult.isGiftWithPurchaseUnlocked && simResult.giftWithPurchaseItem && (
              <SectionHelper skin="warning" size="small" title="Qualified for free gift">
                {simResult.giftWithPurchaseItem}
              </SectionHelper>
            )}

            <Divider />

            <Box align="space-between">
              <Text>Gift wrapping{currentOption ? ` (${currentOption.name})` : ''}:</Text>
              <Text weight="bold" skin={simResult.wrapFee === 0 ? 'success' : 'standard'}>
                {simResult.wrapFee === 0 ? 'Free' : `$${simResult.wrapFee.toFixed(2)}`}
              </Text>
            </Box>

            {includeGreetingCard && isPaid && (
              <Box align="space-between">
                <Text>Personalized greeting card:</Text>
                <Text weight="bold" skin={simResult.cardFee === 0 ? 'success' : 'standard'}>
                  {simResult.cardFee === 0 ? 'Free' : `$${simResult.cardFee.toFixed(2)}`}
                </Text>
              </Box>
            )}

            <Divider />

            <Box align="space-between">
              <Heading size="small">Total additional fees:</Heading>
              <Text weight="bold" size="medium" skin={simResult.totalFee > 0 ? 'error' : 'success'}>
                ${simResult.totalFee.toFixed(2)}
              </Text>
            </Box>

            <Box align="space-between">
              <Heading size="medium">Estimated checkout total:</Heading>
              <Heading size="medium">${(simSubtotal + simResult.totalFee).toFixed(2)}</Heading>
            </Box>

            <Box direction="vertical" gap="4px" marginTop="8px">
              <Text size="tiny" secondary weight="bold">Evaluation details:</Text>
              {simResult.appliedDetails.map((detail, idx) => (
                <Text key={idx} size="tiny" secondary>• {detail}</Text>
              ))}
            </Box>
          </Box>
        </Box>
      </Card.Content>
    </Card>
  );
}
