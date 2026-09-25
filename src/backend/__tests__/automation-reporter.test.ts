import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReportEvent = vi.hoisted(() => vi.fn());
const mockGetOrder = vi.hoisted(() => vi.fn());

vi.mock('@wix/automations', () => ({
  activations: {
    reportEvent: mockReportEvent,
  },
}));

vi.mock('@wix/ecom', () => ({
  orders: {
    getOrder: mockGetOrder,
  },
}));

vi.mock('@wix/essentials', () => ({
  auth: {
    elevate: (fn: any) => fn,
  },
}));

import { reportGiftOptionOrderedAutomation } from '../automation-reporter';

describe('giftcraft automation reporter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reports automation event when contactId is supplied directly', async () => {
    mockReportEvent.mockResolvedValue({});
    const emit = vi.fn();

    await reportGiftOptionOrderedAutomation(
      {
        orderId: 'ord-999',
        orderNumber: '10042',
        contactId: 'contact-123',
        giftOptionName: 'Classic Crimson Ribbon',
        feeAmount: 5.0,
        currency: 'USD',
        itemsCount: 2,
      },
      {},
      emit,
    );

    expect(mockGetOrder).not.toHaveBeenCalled();
    expect(mockReportEvent).toHaveBeenCalledTimes(1);
    const [triggerKey, args] = mockReportEvent.mock.calls[0];
    expect(triggerKey).toBe('gift_option_ordered');
    expect(args.payload).toEqual({
      contactId: 'contact-123',
      orderId: 'ord-999',
      orderNumber: '10042',
      giftOptionName: 'Classic Crimson Ribbon',
      feeAmount: 5.0,
      currency: 'USD',
      itemsCount: 2,
    });
    expect(emit).toHaveBeenCalledWith('gift_automation_report', expect.objectContaining({ outcome: 'success' }));
  });

  it('fetches contactId from order when not supplied', async () => {
    mockGetOrder.mockResolvedValue({
      _id: 'ord-777',
      number: '10077',
      buyerInfo: { contactId: 'contact-from-order' },
    });
    mockReportEvent.mockResolvedValue({});
    const emit = vi.fn();

    await reportGiftOptionOrderedAutomation(
      {
        orderId: 'ord-777',
        giftOptionName: 'Luxury Velvet Box',
      },
      { elevated: true },
      emit,
    );

    expect(mockGetOrder).toHaveBeenCalledWith('ord-777');
    expect(mockReportEvent).toHaveBeenCalledTimes(1);
    const [, args] = mockReportEvent.mock.calls[0];
    expect(args.payload.contactId).toBe('contact-from-order');
    expect(args.payload.orderNumber).toBe('10077');
    expect(emit).toHaveBeenCalledWith('gift_automation_report', expect.objectContaining({ outcome: 'success' }));
  });

  it('emits failure diagnostic and skips report if contactId cannot be found', async () => {
    mockGetOrder.mockResolvedValue({
      _id: 'ord-777',
      buyerInfo: {},
    });
    const emit = vi.fn();

    await reportGiftOptionOrderedAutomation(
      {
        orderId: 'ord-777',
        giftOptionName: 'Luxury Velvet Box',
      },
      {},
      emit,
    );

    expect(mockReportEvent).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('gift_automation_report', expect.objectContaining({
      outcome: 'failure',
      errorCode: 'MISSING_CONTACT_ID',
    }));
  });

  it('catches reportEvent failure without throwing', async () => {
    mockReportEvent.mockRejectedValue(new Error('Network error'));
    const emit = vi.fn();

    await expect(
      reportGiftOptionOrderedAutomation(
        {
          orderId: 'ord-111',
          orderNumber: '10011',
          contactId: 'contact-111',
          giftOptionName: 'Classic Wrap',
        },
        {},
        emit,
      ),
    ).resolves.toBeUndefined();

    expect(emit).toHaveBeenCalledWith('gift_automation_report', expect.objectContaining({
      outcome: 'failure',
      errorCode: 'AUTOMATION_REPORT_FAILED',
    }));
  });
});
