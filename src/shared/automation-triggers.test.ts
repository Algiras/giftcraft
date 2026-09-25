import { describe, expect, it } from 'vitest';
import {
  GIFT_OPTION_ORDERED_TRIGGER_KEY,
  giftAutomationExternalEntityId,
  giftAutomationIdempotencyKey,
  type GiftOptionOrderedPayload,
} from './automation-triggers';

describe('giftcraft automation triggers', () => {
  it('has consistent trigger key matching draft schema', () => {
    expect(GIFT_OPTION_ORDERED_TRIGGER_KEY).toBe('gift_option_ordered');
  });

  it('builds deterministic idempotency keys', () => {
    const key1 = giftAutomationIdempotencyKey('ord-123', 'Classic Crimson Ribbon');
    const key2 = giftAutomationIdempotencyKey('ord-123', 'Classic Crimson Ribbon');
    expect(key1).toBe('giftcraft:ord-123:Classic Crimson Ribbon');
    expect(key1).toBe(key2);
  });

  it('generates valid RFC-4122 v4-like UUIDs as externalEntityId', () => {
    const uuid = giftAutomationExternalEntityId('ord-789', 'Luxury Velvet Box');
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('verifies sample payload structure', () => {
    const payload: GiftOptionOrderedPayload = {
      contactId: 'c1b2c3d4-e5f6-4789-a012-3456789abcde',
      orderId: 'o1b2c3d4-e5f6-4789-a012-3456789abcde',
      orderNumber: '10042',
      giftOptionName: 'Classic Crimson Ribbon',
      greetingCardMessage: 'Happy Birthday!',
      recipientName: 'Jane Doe',
      feeAmount: 5.0,
      currency: 'USD',
      itemsCount: 1,
    };
    expect(payload.contactId).toBeDefined();
    expect(payload.giftOptionName).toBe('Classic Crimson Ribbon');
    expect(payload.feeAmount).toBe(5.0);
  });
});
