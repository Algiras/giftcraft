import { describe, expect, it, vi } from 'vitest';
import { currencyFromSiteProperties, DEFAULT_CURRENCY, loadStoreCurrency } from './store-currency';

describe('currencyFromSiteProperties', () => {
  it('returns the site payment currency', () => {
    expect(currencyFromSiteProperties({ properties: { paymentCurrency: 'eur' } })).toBe('EUR');
  });

  it('trims and uppercases the code', () => {
    expect(currencyFromSiteProperties({ properties: { paymentCurrency: ' gbp ' } })).toBe('GBP');
  });

  it.each([
    [undefined, 'missing properties'],
    [null, 'null properties'],
    [{}, 'no properties object'],
    [{ properties: null }, 'null inner properties'],
    [{ properties: {} }, 'no field'],
    [{ properties: { paymentCurrency: null } }, 'null field'],
    [{ properties: { paymentCurrency: 'US' } }, 'malformed code'],
    [{ properties: { paymentCurrency: 'DOLLARS' } }, 'overlong code'],
  ])('falls back on %s', (props, _label) => {
    expect(currencyFromSiteProperties(props as never)).toBe(DEFAULT_CURRENCY);
  });
});

describe('loadStoreCurrency', () => {
  it('returns the reader currency', async () => {
    expect(await loadStoreCurrency(async () => ({ properties: { paymentCurrency: 'SEK' } }))).toBe('SEK');
  });

  it('degrades to USD when the read throws', async () => {
    const read = vi.fn().mockRejectedValue(new Error('no session'));
    expect(await loadStoreCurrency(read)).toBe(DEFAULT_CURRENCY);
  });
});
