import { describe, it, expect } from 'vitest';
import {
  calculateSubtotal,
  getItemProductId,
  hasQualifyingTag,
  validateGreetingMessage,
  evaluateGiftOptions,
  restrictGiftOptionsForPlan,
  calculateModifierSelectedGiftFees,
  DEFAULT_CARD_FEE,
} from '../gift-engine';
import { GiftOption, CheckoutLineItem, GiftSelection } from '../../types';

describe('GiftCraft Core Engine Test Suite', () => {
  const sampleOptions: GiftOption[] = [
    {
      id: 'opt-classic',
      name: 'Classic Satin Ribbon',
      wrapStyle: 'classic_ribbon',
      price: 5.00,
      characterLimit: 200,
      freeThreshold: 75.00,
      freeCardThreshold: 50.00,
      enabled: true,
      taxable: true,
      giftWithPurchase: {
        minSubtotal: 150.00,
        giftProductName: 'Deluxe Holiday Ornament',
      },
    },
    {
      id: 'opt-luxury',
      name: 'Luxury Velvet & Gold Embossed',
      wrapStyle: 'luxury_gold',
      price: 12.00,
      characterLimit: 300,
      freeThreshold: 120.00,
      enabled: true,
      taxable: true,
      giftWithPurchase: {
        requiredTag: 'vip-collection',
        giftProductName: 'Artisan Scented Candle',
      },
    },
    {
      id: 'opt-eco',
      name: 'Eco Recycled Kraft Paper',
      wrapStyle: 'eco_kraft',
      price: 4.00,
      characterLimit: 150,
      enabled: false, // Disabled
      taxable: false,
    },
  ];

  it('1. calculates subtotal and extracts IDs accurately across dual Catalog V1 and V3 items', () => {
    const items: CheckoutLineItem[] = [
      {
        catalogItemId: 'v1-product-123',
        productName: 'Leather Wallet',
        price: '45.50',
        quantity: 1,
      },
      {
        catalogReference: {
          catalogItemId: 'v3-item-999',
          appId: '1380b703-ce81-ff05-f115-39571d94dfcd',
        },
        productName: 'Silk Scarf',
        price: 30.00,
        quantity: 2,
      },
    ];

    expect(getItemProductId(items[0])).toBe('v1-product-123');
    expect(getItemProductId(items[1])).toBe('v3-item-999');
    expect(calculateSubtotal(items)).toBe(105.50);
  });

  it('2. charges standard gift wrapping fee when cart subtotal is below free threshold', () => {
    const items: CheckoutLineItem[] = [
      { id: '1', catalogItemId: 'item-1', price: 25.00, quantity: 1 },
    ];
    const selection: GiftSelection = {
      optionId: 'opt-classic',
    };

    const res = evaluateGiftOptions({
      lineItems: items,
      selection,
      options: sampleOptions,
    });

    expect(res.eligible).toBe(true);
    expect(res.wrapFee).toBe(5.00);
    expect(res.totalFee).toBe(5.00);
    expect(res.isFreeWrapApplied).toBe(false);
    expect(res.fees.length).toBe(1);
    expect(res.fees[0].price).toBe('5.00');
  });

  it('3. waives gift wrapping fee when subtotal satisfies free threshold', () => {
    const items: CheckoutLineItem[] = [
      { id: '1', catalogItemId: 'item-1', price: 80.00, quantity: 1 },
    ];
    const selection: GiftSelection = {
      optionId: 'opt-classic', // freeThreshold: 75.00
    };

    const res = evaluateGiftOptions({
      lineItems: items,
      selection,
      options: sampleOptions,
    });

    expect(res.eligible).toBe(true);
    expect(res.wrapFee).toBe(0);
    expect(res.totalFee).toBe(0);
    expect(res.isFreeWrapApplied).toBe(true);
    expect(res.fees.length).toBe(0);
    expect(res.appliedDetails.some(d => d.includes('Complimentary Gift Wrapping'))).toBe(true);
  });

  it('4. charges greeting card fee when below freeCardThreshold, and waives when met', () => {
    // Under freeCardThreshold ($50)
    const lowItems: CheckoutLineItem[] = [
      { id: '1', price: 30.00, quantity: 1 },
    ];
    const resLow = evaluateGiftOptions({
      lineItems: lowItems,
      selection: {
        optionId: 'opt-classic',
        includeGreetingCard: true,
        greetingMessage: 'Happy Birthday!',
      },
      options: sampleOptions,
    });

    expect(resLow.cardFee).toBe(DEFAULT_CARD_FEE);
    expect(resLow.isFreeCardApplied).toBe(false);
    expect(resLow.totalFee).toBe(5.00 + DEFAULT_CARD_FEE);

    // Over freeCardThreshold ($50)
    const highItems: CheckoutLineItem[] = [
      { id: '1', price: 55.00, quantity: 1 },
    ];
    const resHigh = evaluateGiftOptions({
      lineItems: highItems,
      selection: {
        optionId: 'opt-classic',
        includeGreetingCard: true,
        greetingMessage: 'Happy Birthday!',
      },
      options: sampleOptions,
    });

    expect(resHigh.cardFee).toBe(0);
    expect(resHigh.isFreeCardApplied).toBe(true);
  });

  it('5. validates greeting card character limit within bounds', () => {
    const validation = validateGreetingMessage('Wishing you all the best!', 200);
    expect(validation.valid).toBe(true);
    expect(validation.currentLength).toBe(25);
    expect(validation.limit).toBe(200);
    expect(validation.error).toBeUndefined();
  });

  it('6. detects and flags greeting messages that exceed the option character limit', () => {
    const longMessage = 'A'.repeat(201);
    const validation = validateGreetingMessage(longMessage, 200);
    expect(validation.valid).toBe(false);
    expect(validation.currentLength).toBe(201);
    expect(validation.error).toBeDefined();

    const res = evaluateGiftOptions({
      lineItems: [{ price: 40, quantity: 1 }],
      selection: {
        optionId: 'opt-classic',
        greetingMessage: longMessage,
      },
      options: sampleOptions,
    });

    expect(res.characterLimitValid).toBe(false);
    expect(res.eligible).toBe(false);
  });

  it('7. unlocks gift-with-purchase when cart subtotal meets minimum threshold', () => {
    const items: CheckoutLineItem[] = [
      { id: '1', price: 160.00, quantity: 1 },
    ];
    const res = evaluateGiftOptions({
      lineItems: items,
      selection: { optionId: 'opt-classic' }, // GWP at $150
      options: sampleOptions,
    });

    expect(res.isGiftWithPurchaseUnlocked).toBe(true);
    expect(res.giftWithPurchaseItem).toBe('Deluxe Holiday Ornament');
  });

  it('8. unlocks gift-with-purchase when cart item contains required promotional tag', () => {
    const items: CheckoutLineItem[] = [
      {
        id: '1',
        price: 50.00,
        quantity: 1,
        tags: ['sale', 'VIP-COLLECTION', 'handcrafted'],
      },
    ];
    expect(hasQualifyingTag(items, 'vip-collection')).toBe(true);

    const res = evaluateGiftOptions({
      lineItems: items,
      selection: { optionId: 'opt-luxury' }, // GWP requires 'vip-collection' tag
      options: sampleOptions,
    });

    expect(res.isGiftWithPurchaseUnlocked).toBe(true);
    expect(res.giftWithPurchaseItem).toBe('Artisan Scented Candle');
  });

  it('9. rejects disabled gift option and reports non-eligibility', () => {
    const res = evaluateGiftOptions({
      lineItems: [{ price: 40, quantity: 1 }],
      selection: { optionId: 'opt-eco' }, // enabled: false
      options: sampleOptions,
    });

    expect(res.eligible).toBe(false);
    expect(res.totalFee).toBe(0);
    expect(res.appliedDetails[0]).toContain('disabled or does not exist');
  });

  it('10. handles empty carts or missing gift selection safely', () => {
    const emptySubtotal = calculateSubtotal([]);
    expect(emptySubtotal).toBe(0);

    const resEmpty = evaluateGiftOptions({
      lineItems: [],
      options: sampleOptions,
    });

    expect(resEmpty.eligible).toBe(false);
    expect(resEmpty.totalFee).toBe(0);
    expect(resEmpty.cartSubtotal).toBe(0);
  });

  it('11. handles defensive edge cases (negative values, NaN strings, missing options)', () => {
    const badItems: CheckoutLineItem[] = [
      { price: -20, quantity: 2 },
      { price: 'invalid_price', quantity: -5 },
    ];
    expect(calculateSubtotal(badItems)).toBe(0);

    const res = evaluateGiftOptions({
      lineItems: badItems,
      selection: { optionId: 'non-existent' },
      options: [],
    });

    expect(res.eligible).toBe(false);
    expect(res.totalFee).toBe(0);
  });

  it('12. verifies full workflow: taxable fee configuration and details list', () => {
    const items: CheckoutLineItem[] = [
      { price: 40.00, quantity: 1 },
    ];
    const res = evaluateGiftOptions({
      lineItems: items,
      selection: {
        optionId: 'opt-luxury',
        includeGreetingCard: true,
        greetingMessage: 'Happy Anniversary!',
      },
      options: sampleOptions,
    });

    expect(res.eligible).toBe(true);
    expect(res.wrapFee).toBe(12.00);
    expect(res.fees.some(f => f.code === 'GIFT_WRAP_FEE' && f.taxDetails?.taxable === true)).toBe(true);
    expect(res.appliedDetails.length).toBeGreaterThan(0);
  });
});

describe('Free vs. Pro plan gating (publishing_config.json benefits)', () => {
  const twoOptions: GiftOption[] = [
    { id: 'a', name: 'Classic', wrapStyle: 'classic_ribbon', price: 5, characterLimit: 200, freeThreshold: 50, freeCardThreshold: 20, enabled: true, taxable: true, giftWithPurchase: { minSubtotal: 100, giftProductName: 'Tag' } },
    { id: 'b', name: 'Luxury', wrapStyle: 'luxury_gold', price: 10, characterLimit: 200, enabled: true, taxable: true },
  ];

  it('leaves options untouched for a paid instance', () => {
    expect(restrictGiftOptionsForPlan(twoOptions, { status: 'paid' })).toEqual(twoOptions);
  });

  it('limits a free instance to one enabled option and strips Pro-only fields', () => {
    const restricted = restrictGiftOptionsForPlan(twoOptions, { status: 'free' });
    expect(restricted[0].enabled).toBe(true);
    expect(restricted[1].enabled).toBe(false);
    expect(restricted[0].freeThreshold).toBeUndefined();
    expect(restricted[0].freeCardThreshold).toBeUndefined();
    expect(restricted[0].giftWithPurchase).toBeUndefined();
  });

  it('fails closed (treats "unavailable" like free) when entitlement cannot be confirmed', () => {
    const restricted = restrictGiftOptionsForPlan(twoOptions, { status: 'unavailable' });
    expect(restricted.filter(o => o.enabled)).toHaveLength(1);
  });

  it('does not charge a Pro-only greeting-card fee for a free-plan instance', () => {
    const options: GiftOption[] = [{ id: 'classic', name: 'Classic', wrapStyle: 'classic_ribbon', price: 5, characterLimit: 200, freeCardThreshold: 1000, enabled: true, taxable: true }];
    const lineItems: CheckoutLineItem[] = [{ id: 'line-1', quantity: 1, price: 20, modifierGroups: [
      { name: 'GiftCraft wrap', modifiers: [{ label: 'Classic', quantity: 1 }] },
      { name: 'GiftCraft greeting card', modifiers: [{ label: 'Yes' }] },
    ] }];

    const paidFees = calculateModifierSelectedGiftFees(lineItems, options, { status: 'paid' });
    expect(paidFees.some(f => f.code.startsWith('GIFT_CARD_'))).toBe(true);

    const freeFees = calculateModifierSelectedGiftFees(lineItems, options, { status: 'free' });
    expect(freeFees.some(f => f.code.startsWith('GIFT_CARD_'))).toBe(false);
    expect(freeFees.some(f => f.code.startsWith('GIFT_WRAP_'))).toBe(true);
  });
});
