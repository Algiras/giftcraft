import { appInstances } from '@wix/app-management';
import { createLifecycleEventHandlers } from '@wix-extensions/core/telemetry';

/**
 * Uninstall lifecycle telemetry: records churn with the request id retained
 * for support diagnostics.
 *
 * NOTE ON MERCHANT DATA: this handler deletes nothing. It only emits a
 * diagnostic. GiftCraft stores merchant-configured gift-wrap/greeting-card
 * options (name, price, free-threshold, character limit) in its own
 * app-owned collection (`giftcraft-options`). The buyer's own greeting-card
 * message is evaluated at checkout (see `src/shared/gift-engine.ts`) but is
 * never persisted to this collection -- it flows into the order/line item
 * itself, not app storage. `giftcraft-options` is pure merchant
 * configuration with no reference to any individual order, contact, or
 * customer, and it is NOT removed on uninstall.
 *
 * No Wix doc mandates deletion on APP_REMOVED (the App Market review
 * reference calls install/remove cleanup "recommended, not a universal hard
 * requirement"), and no doc states whether Wix purges app-owned collection
 * data itself. So this is an open question rather than a known violation --
 * but there is currently no automated path to satisfy a deletion request for
 * this data either.
 */
export default appInstances.onAppInstanceRemoved(createLifecycleEventHandlers('giftcraft').onAppRemoved);
