import { showAppToast as coreShowToast } from '@wix-extensions/core/toast';

export type ToastType = 'success' | 'error';

/**
 * Thin wrapper around core's showAppToast, preserving GiftCraft's narrower
 * ToastType signature ('success' | 'error' only, no 'warning' / 'standard').
 * core's showAppToast already swallows errors when not running inside the
 * Wix dashboard host (unit tests / browser harness).
 */
export function showAppToast(message: string, type: ToastType = 'success'): void {
  coreShowToast(message, type);
}
