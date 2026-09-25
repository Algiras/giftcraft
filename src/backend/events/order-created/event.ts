import { orders } from '@wix/ecom';
import { WRAP_MODIFIER_GROUP, GREETING_CARD_MODIFIER_GROUP } from '../../../shared/gift-engine';
import { reportGiftOptionOrderedAutomation } from '../../automation-reporter';

orders.onOrderCreated(async event => {
  const order = event.entity;
  if (!order?._id) return;

  const lineItems = order.lineItems ?? [];
  let foundGiftWrap = false;
  let giftOptionName = '';
  let greetingCard = false;
  let wrappedItemCount = 0;

  for (const item of lineItems) {
    const modifierGroups = item.modifierGroups ?? [];
    for (const mg of modifierGroups) {
      const groupName = mg.name?.original?.trim() || '';
      if (groupName === WRAP_MODIFIER_GROUP) {
        foundGiftWrap = true;
        wrappedItemCount += item.quantity ?? 1;
        const firstMod = mg.modifiers?.[0]?.label?.original;
        if (firstMod && !giftOptionName) {
          giftOptionName = firstMod;
        }
      } else if (groupName === GREETING_CARD_MODIFIER_GROUP) {
        greetingCard = true;
      }
    }
  }

  if (foundGiftWrap || greetingCard) {
    try {
      await reportGiftOptionOrderedAutomation(
        {
          orderId: order._id,
          orderNumber: order.number ? String(order.number) : undefined,
          contactId: order.buyerInfo?.contactId ?? undefined,
          giftOptionName: giftOptionName || (greetingCard ? 'Greeting Card' : 'Gift Wrap'),
          itemsCount: wrappedItemCount > 0 ? wrappedItemCount : 1,
          currency: order.currency ?? undefined,
        },
        { elevated: true },
      );
    } catch (error) {
      console.error('[GiftCraft] onOrderCreated automation trigger failed:', error);
    }
  }
});
