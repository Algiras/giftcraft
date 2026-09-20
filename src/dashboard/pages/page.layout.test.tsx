// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import type { GiftOption } from '../../types';

// --- Shared module mocks -----------------------------------------------
// These keep the test focused on layout/structure: no real Wix Data, entitlement,
// or eCommerce detection calls happen during render.

let optionsFixture: GiftOption[] = [];
let entitlementStatus: 'free' | 'paid' = 'free';

const configuration = vi.hoisted(() => ({
  loadConfiguration: vi.fn(),
  saveConfiguration: vi.fn().mockResolvedValue(undefined),
  assessConfigurationStorage: vi.fn().mockResolvedValue({ ready: true, state: 'ready' }),
}));
vi.mock('../../shared/configuration', () => configuration);

vi.mock('../../shared/storage-readiness', () => ({
  confirmStorageWithAutoRetry: (probe: () => Promise<unknown>) => probe(),
  extractRequestId: () => undefined,
  storageDetailHint: () => '',
}));

vi.mock('../../shared/logger', () => ({
  emitDiagnostic: vi.fn(),
  emitBackendDiagnostic: vi.fn(),
  markDashboardLoaded: vi.fn(),
  markSetupFinished: vi.fn(),
  logger: { trackUsage: vi.fn() },
}));

vi.mock('../../shared/toast', () => ({
  showAppToast: vi.fn(),
}));

vi.mock('../../shared/entitlement', () => ({
  getAppEntitlement: vi.fn(() => Promise.resolve({ status: entitlementStatus })),
  canUsePaidFeatures: (entitlement: { status: string }) => entitlement.status === 'paid',
  getWixPricingPageUrl: () => 'https://example.com/pricing',
  AppEntitlement: {},
}));

vi.mock('../../shared/ecommerce', () => ({
  resolveEcommerceInstalled: () => true,
  WIX_STORES_APP_MARKET_URL: 'https://example.com/stores',
  WIX_ECOMMERCE_APP_MARKET_URL: 'https://example.com/ecommerce',
}));

vi.mock('../../shared/store-currency', () => ({
  loadStoreCurrency: vi.fn().mockResolvedValue('USD'),
}));

vi.mock('@wix/app-management', () => ({
  appInstances: {
    getAppInstance: vi.fn().mockResolvedValue({ instance: { instanceId: 'test-instance' }, site: { installedWixApps: [] } }),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  optionsFixture = [];
  entitlementStatus = 'free';
  configuration.loadConfiguration.mockImplementation(() => Promise.resolve(optionsFixture));
  configuration.assessConfigurationStorage.mockResolvedValue({ ready: true, state: 'ready' });
});

/** True when `a` appears before `b` in document order (DOM position). */
function appearsBefore(a: Element, b: Element): boolean {
  // eslint-disable-next-line no-bitwise
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

async function renderDashboard() {
  const { default: GiftCraftPage } = await import('./page');
  render(<GiftCraftPage />);
  // Wait for the initial storage/entitlement load to settle.
  await waitFor(() => {
    expect(configuration.loadConfiguration).toHaveBeenCalled();
  });
}

describe('GiftCraft dashboard: information hierarchy', () => {
  it('renders the gift options table before the free-plan upsell banner', async () => {
    entitlementStatus = 'free';
    optionsFixture = [];
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Gift options')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText("You're on the Basic (free) plan")).toBeTruthy();
    });

    const table = screen.getByText('Gift options');
    const upsell = screen.getByText("You're on the Basic (free) plan");

    expect(appearsBefore(table, upsell)).toBe(true);
  });

  it('renders the gift options table before the stat tiles row', async () => {
    entitlementStatus = 'paid';
    optionsFixture = [];
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Gift options')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('Active gift options')).toBeTruthy();
    });

    const table = screen.getByText('Gift options');
    const stat = screen.getByText('Active gift options');

    expect(appearsBefore(table, stat)).toBe(true);
  });

  it('renders nothing from PlanStatusCard for a paid merchant with no issue to flag', async () => {
    entitlementStatus = 'paid';
    optionsFixture = [];
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Gift options')).toBeTruthy();
    });

    // No permanent "you're on Pro" confirmation banner, and no free-plan upsell either.
    expect(screen.queryByText('Pro plan active')).toBeNull();
    expect(screen.queryByText("You're on the Basic (free) plan")).toBeNull();
    expect(screen.queryByText('Upgrade to Pro')).toBeNull();
  });

  it('still shows the free-plan upsell with its call to action for a free-plan merchant', async () => {
    entitlementStatus = 'free';
    optionsFixture = [];
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("You're on the Basic (free) plan")).toBeTruthy();
    });

    expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
    expect(screen.queryByText('Contact support')).toBeNull();
  });

  it('shows a Pro plan badge in the header for a paid merchant instead of a standing banner', async () => {
    entitlementStatus = 'paid';
    optionsFixture = [];
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Pro plan')).toBeTruthy();
    });
  });

  it('does not show the Pro plan badge for a free-plan merchant', async () => {
    entitlementStatus = 'free';
    optionsFixture = [];
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("You're on the Basic (free) plan")).toBeTruthy();
    });

    expect(screen.queryByText('Pro plan')).toBeNull();
  });
});
