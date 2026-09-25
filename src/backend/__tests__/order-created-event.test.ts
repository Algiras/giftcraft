import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReportGiftAutomation = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const onOrderCreated = vi.hoisted(() => vi.fn());

vi.mock('@wix/ecom', () => ({
  orders: {
    onOrderCreated,
  },
}));

vi.mock('../automation-reporter', () => ({
  reportGiftOptionOrderedAutomation: mockReportGiftAutomation,
}));

import '../events/order-created/event';

describe('giftcraft onOrderCreated event handler', () => {
  beforeEach(() => {
    mockReportGiftAutomation.mockClear();
  });

  it('registers onOrderCreated listener on import', () => {
    expect(onOrderCreated).toHaveBeenCalledTimes(1);
    expect(typeof onOrderCreated.mock.calls[0][0]).toBe('function');
  });

  it('triggers automation when order contains GiftCraft wrap modifier', async () => {
    const handler = onOrderCreated.mock.calls[0][0];
    const fakeEvent = {
      entity: {
        _id: 'ord-123',
        number: '10042',
        currency: 'USD',
        buyerInfo: { contactId: 'contact-abc' },
        lineItems: [
          {
            quantity: 2,
            modifierGroups: [
              {
                name: { original: 'GiftCraft wrap' },
                modifiers: [{ label: { original: 'Classic Crimson Ribbon' } }],
              },
            ],
          },
        ],
      },
    };

    await handler(fakeEvent);

    expect(mockReportGiftAutomation).toHaveBeenCalledTimes(1);
    expect(mockReportGiftAutomation).toHaveBeenCalledWith(
      {
        orderId: 'ord-123',
        orderNumber: '10042',
        contactId: 'contact-abc',
        giftOptionName: 'Classic Crimson Ribbon',
        itemsCount: 2,
        currency: 'USD',
      },
      { elevated: true },
    );
  });

  it('ignores orders with no GiftCraft modifiers', async () => {
    const handler = onOrderCreated.mock.calls[0][0];
    const fakeEvent = {
      entity: {
        _id: 'ord-456',
        lineItems: [
          {
            quantity: 1,
            modifierGroups: [
              {
                name: { original: 'Size' },
                modifiers: [{ label: { original: 'Large' } }],
              },
            ],
          },
        ],
      },
    };

    await handler(fakeEvent);
    expect(mockReportGiftAutomation).not.toHaveBeenCalled();
  });
});
