import { activations } from '@wix/automations';
import { orders } from '@wix/ecom';
import { auth } from '@wix/essentials';
import {
  GIFT_OPTION_ORDERED_TRIGGER_KEY,
  giftAutomationExternalEntityId,
  giftAutomationIdempotencyKey,
  type GiftOptionOrderedPayload,
} from '../shared/automation-triggers';
import { emitDiagnostic } from '../shared/logger';

export interface AutomationReportOptions {
  elevated?: boolean;
}

type DiagnosticEmitter = typeof emitDiagnostic;

export interface GiftOrderAutomationInput {
  orderId: string;
  orderNumber?: string;
  contactId?: string;
  giftOptionName: string;
  greetingCardMessage?: string;
  recipientName?: string;
  feeAmount?: number;
  currency?: string;
  itemsCount?: number;
}

async function resolveOrderDetails(
  orderId: string,
  options: AutomationReportOptions = {},
): Promise<{ contactId?: string; orderNumber?: string }> {
  try {
    const getOrder = options.elevated ? auth.elevate(orders.getOrder) : orders.getOrder;
    const order = await getOrder(orderId);
    return {
      contactId: order.buyerInfo?.contactId ?? undefined,
      orderNumber: order.number ? String(order.number) : undefined,
    };
  } catch {
    return {};
  }
}

export async function reportGiftOptionOrderedAutomation(
  input: GiftOrderAutomationInput,
  options: AutomationReportOptions = {},
  emit: DiagnosticEmitter = emitDiagnostic,
): Promise<void> {
  let contactId = input.contactId;
  let orderNumber = input.orderNumber;

  if (!contactId || !orderNumber) {
    const details = await resolveOrderDetails(input.orderId, options);
    contactId = contactId ?? details.contactId;
    orderNumber = orderNumber ?? details.orderNumber;
  }

  if (!contactId) {
    emit('gift_automation_report', {
      outcome: 'failure',
      surface: 'spi',
      errorCode: 'MISSING_CONTACT_ID',
    });
    return;
  }

  const payload: GiftOptionOrderedPayload = {
    contactId,
    orderId: input.orderId,
    orderNumber: orderNumber || input.orderId,
    giftOptionName: input.giftOptionName,
    ...(input.greetingCardMessage ? { greetingCardMessage: input.greetingCardMessage } : {}),
    ...(input.recipientName ? { recipientName: input.recipientName } : {}),
    ...(input.feeAmount !== undefined ? { feeAmount: input.feeAmount } : {}),
    ...(input.currency ? { currency: input.currency } : {}),
    ...(input.itemsCount !== undefined ? { itemsCount: input.itemsCount } : {}),
  };

  const start = Date.now();
  try {
    const reportEvent = options.elevated ? auth.elevate(activations.reportEvent) : activations.reportEvent;
    await reportEvent(GIFT_OPTION_ORDERED_TRIGGER_KEY, {
      payload,
      externalEntityId: giftAutomationExternalEntityId(input.orderId, input.giftOptionName),
      idempotency: { key: giftAutomationIdempotencyKey(input.orderId, input.giftOptionName) },
    });
    emit('gift_automation_report', { outcome: 'success', surface: 'spi', durationMs: Date.now() - start });
  } catch (error) {
    emit('gift_automation_report', {
      outcome: 'failure',
      surface: 'spi',
      durationMs: Date.now() - start,
      errorCode: 'AUTOMATION_REPORT_FAILED',
    });
    console.error('[GiftCraft] Gift option ordered automation trigger failed:', error);
  }
}
