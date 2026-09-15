export type WrapStyle =
  | 'classic_ribbon'
  | 'luxury_gold'
  | 'eco_kraft'
  | 'holiday_festive'
  | 'custom';

export interface GiftWithPurchaseCondition {
  minSubtotal?: number;
  requiredTag?: string;
  giftProductName: string;
  giftProductId?: string;
}

export interface GiftOption {
  id: string;
  name: string;
  wrapStyle: WrapStyle;
  price: number;
  characterLimit: number;
  freeThreshold?: number; // Order subtotal above which gift wrapping is waived ($0.00)
  freeCardThreshold?: number; // Order subtotal above which greeting card is complimentary
  giftWithPurchase?: GiftWithPurchaseCondition;
  enabled: boolean;
  taxable?: boolean;
  description?: string;
  createdAt?: string;
}

/**
 * Dual Catalog V1 & Catalog V3 compatibility interfaces
 */
export interface CatalogReference {
  catalogItemId?: string;
  appId?: string;
  options?: Record<string, any>;
}

export interface CheckoutLineItem {
  id?: string;
  catalogItemId?: string; // Catalog V1
  catalogReference?: CatalogReference; // Catalog V3
  name?: string;
  productName?: string;
  quantity: number;
  price: number | string;
  tags?: string[];
  categoryId?: string;
  modifierGroups?: GiftModifierGroup[];
}

/** The subset of Wix line-item modifier data used by the GiftCraft fee SPI. */
export interface GiftModifierGroup {
  name?: string;
  modifiers?: Array<{ label?: string; quantity?: number }>;
}

export interface GiftSelection {
  optionId: string;
  includeGreetingCard?: boolean;
  senderName?: string;
  recipientName?: string;
  greetingMessage?: string;
}

export interface WixAdditionalFee {
  code: string;
  name: string;
  price: string;
  taxDetails?: {
    taxable: boolean;
  };
  lineItemIds?: string[];
}

export interface GiftEvaluationInput {
  currency?: string;
  lineItems: CheckoutLineItem[];
  selection?: GiftSelection;
  options: GiftOption[];
}

/**
 * A structured, translation-ready evaluation detail. `gift-engine.ts` (a shared helper
 * whose output is rendered in the dashboard preview) must never bake English sentences
 * into these — it emits a stable `code` plus raw numeric/string `values`, and the
 * dashboard component maps the code to a localized ICU message.
 */
export type GiftEvaluationDetail =
  | { code: 'NO_OPTION_SELECTED' }
  | { code: 'OPTION_UNAVAILABLE' }
  | { code: 'FREE_WRAP_APPLIED'; values: { subtotal: number; threshold: number } }
  | { code: 'WRAP_FEE_APPLIED'; values: { name: string; fee: number } }
  | { code: 'FREE_CARD_APPLIED'; values: { threshold: number } }
  | { code: 'CARD_FEE_APPLIED'; values: { fee: number; threshold: number } }
  | { code: 'CARD_INCLUDED' }
  | { code: 'GIFT_WITH_PURCHASE_UNLOCKED'; values: { giftName: string } };

export interface GiftEvaluationResult {
  eligible: boolean;
  wrapFee: number;
  cardFee: number;
  totalFee: number;
  fees: WixAdditionalFee[];
  isFreeWrapApplied: boolean;
  isFreeCardApplied: boolean;
  isGiftWithPurchaseUnlocked: boolean;
  giftWithPurchaseItem?: string;
  characterLimitValid: boolean;
  appliedOption?: GiftOption;
  appliedDetails: GiftEvaluationDetail[];
  cartSubtotal: number;
}
