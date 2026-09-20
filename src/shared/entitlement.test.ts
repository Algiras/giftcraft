import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getAppInstance: vi.fn() }));
vi.mock('@wix/app-management', () => ({ appInstances: api }));

import { canUsePaidFeatures, getAppEntitlement, getWixPricingPageUrl } from './entitlement';

beforeEach(() => vi.resetAllMocks());

describe('Wix Billing entitlement (giftcraft)', () => {
  it('uses Wix app-instance state rather than a browser flag', async () => {
    api.getAppInstance.mockResolvedValue({ instance: { isFree: false, billing: { packageName: 'giftcraft-pro' } } });
    await expect(getAppEntitlement()).resolves.toEqual({ status: 'paid', packageName: 'giftcraft-pro' });
  });

  it('fails closed when Wix cannot confirm a paid plan', async () => {
    api.getAppInstance.mockRejectedValue(new Error('unavailable'));
    expect(canUsePaidFeatures(await getAppEntitlement())).toBe(false);
  });


  it('builds the documented Wix pricing-page upgrade URL', () => {
    expect(getWixPricingPageUrl('0ed8d640-b905-4fb7-b40b-379652fd6d07', 'instance-123')).toBe(
      'https://www.wix.com/apps/upgrade/0ed8d640-b905-4fb7-b40b-379652fd6d07?appInstanceId=instance-123'
    );
  });

  it('does not build an upgrade URL without a known app instance', () => {
    expect(getWixPricingPageUrl('0ed8d640-b905-4fb7-b40b-379652fd6d07', '')).toBeUndefined();
    expect(getWixPricingPageUrl('', 'instance-123')).toBeUndefined();
  });
});
