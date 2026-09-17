import { siteProperties } from '@wix/business-tools';

export type PaymentCurrencyReader = () => Promise<SitePropertiesPaymentCurrency>;

/** Minimal slice of the Site Properties response this helper understands. */
export type SitePropertiesPaymentCurrency = {
  properties?: { paymentCurrency?: string | null } | null;
};

/**
 * Fallback when Business Info is unavailable or the site has no payment
 * currency set. Matches the previous hardcoded behavior so a failed read can
 * never render less than the dashboard showed before.
 */
export const DEFAULT_CURRENCY = 'USD';

export function currencyFromSiteProperties(
  props: SitePropertiesPaymentCurrency | null | undefined,
): string {
  const code = props?.properties?.paymentCurrency?.trim().toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : DEFAULT_CURRENCY;
}

/**
 * Reads the site's billing currency in a dashboard page via Business Info
 * (Site Properties). Same no-scope call pattern as business details; any
 * failure degrades to DEFAULT_CURRENCY instead of breaking the load.
 */
export async function loadStoreCurrency(
  read: PaymentCurrencyReader = () => siteProperties.getSiteProperties(),
): Promise<string> {
  try {
    return currencyFromSiteProperties(await read());
  } catch {
    return DEFAULT_CURRENCY;
  }
}
