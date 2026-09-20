import { appInstances } from '@wix/app-management';
import { createLifecycleEventHandlers } from '@wix-extensions/core/telemetry';

export default appInstances.onAppInstanceRemoved(createLifecycleEventHandlers('giftcraft').onAppRemoved);
