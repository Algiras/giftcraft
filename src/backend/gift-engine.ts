import {
  GiftOption,
  CheckoutLineItem,
  GiftEvaluationInput,
  GiftEvaluationResult,
  WixAdditionalFee,
  GiftSelection,
} from '../types';
import { logger } from '../shared/logger';

export const DEFAULT_CARD_FEE = 2.50;

/**
 * Extracts product or catalog item identifier supporting dual Catalog V1 and Catalog V3 schemas.
 */
export function getItemProductId(item: CheckoutLineItem): string {
  if (!item) return '';
  // Catalog V3 standard
  if (item.catalogReference?.catalogItemId) {
    return item.catalogReference.catalogItemId;
  }
  // Catalog V1 / legacy standard
  if (item.catalogItemId) {
    return item.catalogItemId;
  }
  return item.id || '';
}

/**
 * Calculates cart subtotal with dual catalog compatibility (V1 & V3) and defensive number parsing.
 */
export function calculateSubtotal(items: CheckoutLineItem[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const rawTotal = items.reduce((sum, item) => {
    const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 0;
    const priceNum = typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0'));
    const safePrice = isNaN(priceNum) || priceNum < 0 ? 0 : priceNum;
    return sum + (safePrice * qty);
  }, 0);
  return Math.round(rawTotal * 100) / 100;
}

/**
 * Checks whether any line item contains a required tag (e.g. promotional or luxury item tags).
 */
export function hasQualifyingTag(items: CheckoutLineItem[], requiredTag?: string): boolean {
  if (!requiredTag || !Array.isArray(items) || items.length === 0) return false;
  const targetTag = requiredTag.trim().toLowerCase();
  return items.some(item => {
    if (!Array.isArray(item.tags) || item.tags.length === 0) return false;
    return item.tags.some(t => t.trim().toLowerCase() === targetTag);
  });
}

/**
 * Validates personalized greeting message against character limit constraint.
 */
export function validateGreetingMessage(
  message?: string,
  limit: number = 250
): { valid: boolean; currentLength: number; limit: number; error?: string } {
  const currentLength = message ? message.length : 0;
  if (currentLength > limit) {
    return {
      valid: false,
      currentLength,
      limit,
      error: `Greeting message exceeds character limit (${currentLength}/${limit})`,
    };
  }
  return {
    valid: true,
    currentLength,
    limit,
  };
}

/**
 * Evaluates gift options, wrapping fees, greeting card waivers, and gift-with-purchase incentives.
 */
export function evaluateGiftOptions(input: GiftEvaluationInput): GiftEvaluationResult {
  const subtotal = calculateSubtotal(input.lineItems);
  const details: string[] = [];
  const fees: WixAdditionalFee[] = [];

  const activeOptions = (input.options || []).filter(opt => opt.enabled);

  // If no selection provided or no active options
  if (!input.selection || activeOptions.length === 0) {
    return {
      eligible: false,
      wrapFee: 0,
      cardFee: 0,
      totalFee: 0,
      fees: [],
      isFreeWrapApplied: false,
      isFreeCardApplied: false,
      isGiftWithPurchaseUnlocked: false,
      characterLimitValid: true,
      appliedDetails: ['No gift wrapping option selected or available.'],
      cartSubtotal: subtotal,
    };
  }

  const selected = activeOptions.find(opt => opt.id === input.selection?.optionId);
  if (!selected) {
    return {
      eligible: false,
      wrapFee: 0,
      cardFee: 0,
      totalFee: 0,
      fees: [],
      isFreeWrapApplied: false,
      isFreeCardApplied: false,
      isGiftWithPurchaseUnlocked: false,
      characterLimitValid: true,
      appliedDetails: ['Selected gift option is disabled or does not exist.'],
      cartSubtotal: subtotal,
    };
  }

  // 1. Character Limit Validation
  const messageValidation = validateGreetingMessage(
    input.selection.greetingMessage,
    selected.characterLimit
  );

  // 2. Gift Wrapping Fee & Free Threshold Evaluation
  let wrapFee = selected.price;
  let isFreeWrapApplied = false;

  if (selected.freeThreshold !== undefined && selected.freeThreshold > 0 && subtotal >= selected.freeThreshold) {
    isFreeWrapApplied = true;
    wrapFee = 0;
    details.push(`Complimentary Gift Wrapping: Cart subtotal $${subtotal.toFixed(2)} reached free threshold $${selected.freeThreshold.toFixed(2)}`);
  } else {
    details.push(`Gift Wrapping (${selected.name}): $${wrapFee.toFixed(2)}`);
  }

  // 3. Greeting Card Fee & Complimentary Card Evaluation
  let cardFee = 0;
  let isFreeCardApplied = false;

  if (input.selection.includeGreetingCard) {
    if (
      selected.freeCardThreshold !== undefined &&
      selected.freeCardThreshold > 0 &&
      subtotal >= selected.freeCardThreshold
    ) {
      isFreeCardApplied = true;
      cardFee = 0;
      details.push(`Complimentary Greeting Card: Cart subtotal reached free card threshold $${selected.freeCardThreshold.toFixed(2)}`);
    } else if (selected.freeCardThreshold !== undefined && subtotal < selected.freeCardThreshold) {
      cardFee = DEFAULT_CARD_FEE;
      details.push(`Personalized Greeting Card: $${cardFee.toFixed(2)} (Spend $${selected.freeCardThreshold.toFixed(2)} for free card)`);
    } else {
      // If freeCardThreshold is not set, greeting card is complimentary with wrap
      isFreeCardApplied = true;
      cardFee = 0;
      details.push('Personalized Greeting Card included');
    }
  }

  // 4. Gift-with-Purchase (GWP) Qualification
  let isGiftWithPurchaseUnlocked = false;
  let giftWithPurchaseItem: string | undefined = undefined;

  if (selected.giftWithPurchase) {
    const gwp = selected.giftWithPurchase;
    const subtotalMet = gwp.minSubtotal !== undefined && gwp.minSubtotal > 0 && subtotal >= gwp.minSubtotal;
    const tagMet = gwp.requiredTag ? hasQualifyingTag(input.lineItems, gwp.requiredTag) : false;

    if (subtotalMet || tagMet) {
      isGiftWithPurchaseUnlocked = true;
      giftWithPurchaseItem = gwp.giftProductName;
      details.push(`Bonus Gift Unlocked: ${gwp.giftProductName}`);
      logger.trackUsage('GIFT_WITH_PURCHASE_TRIGGERED', {
        giftName: gwp.giftProductName,
        subtotal,
        triggeredByTag: tagMet,
        triggeredBySubtotal: subtotalMet,
      });
    }
  }

  // Total fees
  const totalFee = Math.round((wrapFee + cardFee) * 100) / 100;

  if (wrapFee > 0) {
    fees.push({
      code: 'GIFT_WRAP_FEE',
      name: `Gift Wrapping (${selected.name})`,
      price: wrapFee.toFixed(2),
      taxDetails: { taxable: !!selected.taxable },
    });
  }

  if (cardFee > 0) {
    fees.push({
      code: 'GREETING_CARD_FEE',
      name: 'Personalized Greeting Card',
      price: cardFee.toFixed(2),
      taxDetails: { taxable: !!selected.taxable },
    });
  }

  // Structured telemetry
  logger.trackUsage('GIFT_EVALUATED', {
    optionId: selected.id,
    optionName: selected.name,
    wrapStyle: selected.wrapStyle,
    subtotal,
    wrapFee,
    cardFee,
    totalFee,
    isFreeWrapApplied,
    isFreeCardApplied,
    isGiftWithPurchaseUnlocked,
    characterLimitValid: messageValidation.valid,
  });

  return {
    eligible: messageValidation.valid,
    wrapFee,
    cardFee,
    totalFee,
    fees,
    isFreeWrapApplied,
    isFreeCardApplied,
    isGiftWithPurchaseUnlocked,
    giftWithPurchaseItem,
    characterLimitValid: messageValidation.valid,
    appliedOption: selected,
    appliedDetails: details,
    cartSubtotal: subtotal,
  };
}
