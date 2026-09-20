import {
  GiftOption,
  CheckoutLineItem,
  GiftEvaluationInput,
  GiftEvaluationResult,
  GiftEvaluationDetail,
  WixAdditionalFee,
} from '../types';
import { emitDiagnostic, logger } from '../shared/logger';
import { AppEntitlement, canUsePaidFeatures } from '../shared/entitlement';

// This module is reached from BOTH the SPI plugin (genuine backend, checkout
// fee calculation) and the dashboard fee-preview UI (browser). The
// diagnostics emitter is therefore injectable on both entry points below:
// they default to the PLAIN, dashboard-safe `emitDiagnostic` (which does not
// elevate), and the SPI plugin call site passes the elevated
// `emitBackendDiagnostic` explicitly. See
// `05-volume-tiered-pricing/discountcraft/src/shared/configuration.ts` for
// the equivalent reader/option parameterization pattern used elsewhere in
// this portfolio.
type DiagnosticEmitter = typeof emitDiagnostic;

export const DEFAULT_CARD_FEE = 2.50;
export const WRAP_MODIFIER_GROUP = 'GiftCraft wrap';
export const GREETING_CARD_MODIFIER_GROUP = 'GiftCraft greeting card';

/** Free-plan benefits, straight from publishing_config.json's Basic plan: one standard
 *  gift-wrap option, charged at a flat rate. Everything else (multiple wrap styles,
 *  greeting cards, gift-with-purchase threshold rules) is Pro-only. */
export const FREE_PLAN_MAX_ENABLED_OPTIONS = 1;

function normalized(value?: string): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

/**
 * Applies the Basic-vs-Pro plan limits from publishing_config.json to a merchant's
 * saved gift options: at most one enabled option, no free-threshold waivers, and no
 * gift-with-purchase incentives. Must be applied both in dashboard previews and before
 * any fee is charged, so a free-plan merchant can never save (or have applied) a Pro rule.
 */
export function restrictGiftOptionsForPlan(options: GiftOption[], entitlement: AppEntitlement): GiftOption[] {
  if (canUsePaidFeatures(entitlement)) return options;
  let usedFreeSlot = false;
  return options.map(option => {
    const keepEnabled = option.enabled && !usedFreeSlot;
    if (keepEnabled) usedFreeSlot = true;
    return {
      ...option,
      enabled: keepEnabled,
      freeThreshold: undefined,
      freeCardThreshold: undefined,
      giftWithPurchase: undefined,
    };
  });
}

/**
 * Creates native Wix additional fees only from a shopper's product-modifier
 * selection. A merchant configuration alone can never create a fee. `entitlement`
 * gates Pro-only benefits (multiple wrap options, greeting-card fees) so the SPI
 * never applies a Pro rule for a free instance, defaulting to `paid` only for
 * callers (existing tests, tools) that intentionally exercise unrestricted output.
 */
export function calculateModifierSelectedGiftFees(
  lineItems: CheckoutLineItem[],
  options: GiftOption[],
  entitlement: AppEntitlement = { status: 'paid' },
  emit: DiagnosticEmitter = emitDiagnostic
): WixAdditionalFee[] {
  const restrictedOptions = restrictGiftOptionsForPlan(options, entitlement);
  const allowGreetingCardFee = canUsePaidFeatures(entitlement);
  const subtotal = calculateSubtotal(lineItems);
  const fees: WixAdditionalFee[] = [];

  for (const item of lineItems) {
    const groups = item.modifierGroups ?? [];
    const selectedNames = groups
      .filter(group => normalized(group.name) === normalized(WRAP_MODIFIER_GROUP))
      .flatMap(group => group.modifiers ?? [])
      .map(modifier => ({ name: normalized(modifier.label), quantity: Math.max(1, modifier.quantity ?? item.quantity ?? 1) }));
    const greetingSelected = groups.some(group =>
      normalized(group.name) === normalized(GREETING_CARD_MODIFIER_GROUP) &&
      (group.modifiers ?? []).some(modifier => ['yes', 'true', 'include'].includes(normalized(modifier.label))),
    );

    for (const selected of selectedNames) {
      const option = restrictedOptions.find(candidate => candidate.enabled && normalized(candidate.name) === selected.name);
      if (!option) continue;
      const wrapIsFree = option.freeThreshold !== undefined && subtotal >= option.freeThreshold;
      const cardIsFree = option.freeCardThreshold === undefined || subtotal >= option.freeCardThreshold;
      const itemId = item.id;
      if (!wrapIsFree && option.price > 0) {
        fees.push({
          code: `GIFT_WRAP_${option.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
          name: `Gift wrapping: ${option.name}`.slice(0, 50),
          price: (option.price * selected.quantity).toFixed(2),
          taxDetails: { taxable: !!option.taxable },
          ...(itemId ? { lineItemIds: [itemId] } : {}),
        });
      }
      if (allowGreetingCardFee && greetingSelected && !cardIsFree) {
        fees.push({
          code: `GIFT_CARD_${option.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
          name: 'Personalized greeting card',
          price: (DEFAULT_CARD_FEE * selected.quantity).toFixed(2),
          taxDetails: { taxable: !!option.taxable },
          ...(itemId ? { lineItemIds: [itemId] } : {}),
        });
      }
    }
  }
  emit('fee_rule_evaluated', {
    outcome: 'success',
    surface: 'fee_rules',
    mode: 'real',
  });
  return fees;
}

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
export function evaluateGiftOptions(input: GiftEvaluationInput, emit: DiagnosticEmitter = emitDiagnostic): GiftEvaluationResult {
  const subtotal = calculateSubtotal(input.lineItems);
  const details: GiftEvaluationDetail[] = [];
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
      appliedDetails: [{ code: 'NO_OPTION_SELECTED' }],
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
      appliedDetails: [{ code: 'OPTION_UNAVAILABLE' }],
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
    details.push({ code: 'FREE_WRAP_APPLIED', values: { subtotal, threshold: selected.freeThreshold } });
  } else {
    details.push({ code: 'WRAP_FEE_APPLIED', values: { name: selected.name, fee: wrapFee } });
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
      details.push({ code: 'FREE_CARD_APPLIED', values: { threshold: selected.freeCardThreshold } });
    } else if (selected.freeCardThreshold !== undefined && subtotal < selected.freeCardThreshold) {
      cardFee = DEFAULT_CARD_FEE;
      details.push({ code: 'CARD_FEE_APPLIED', values: { fee: cardFee, threshold: selected.freeCardThreshold } });
    } else {
      // If freeCardThreshold is not set, greeting card is complimentary with wrap
      isFreeCardApplied = true;
      cardFee = 0;
      details.push({ code: 'CARD_INCLUDED' });
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
      details.push({ code: 'GIFT_WITH_PURCHASE_UNLOCKED', values: { giftName: gwp.giftProductName } });
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

  emit('fee_rule_evaluated', {
    outcome: 'success',
    surface: 'dashboard',
    mode: 'sample',
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
