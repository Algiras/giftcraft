import { expect, test, type Page } from '@playwright/test';

// react-intl logs a console.warn (not console.error) for MISSING_TRANSLATION, but keep an
// allowlist of substrings here in case that ever surfaces as an error-level log too. The
// harness serves no favicon.ico, so the browser's automatic favicon request always 404s -
// that is harness noise, not a product defect.
const BENIGN_ERROR_SUBSTRINGS = ['MISSING_TRANSLATION', 'react-intl'];

function attachConsoleCapture(page: Page, errors: string[]) {
  page.on('pageerror', error => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (BENIGN_ERROR_SUBSTRINGS.some(s => text.includes(s))) return;
    // Chromium's generic "Failed to load resource: 404" message omits the URL, but its
    // location() always carries it - the harness serves no favicon.ico, so the browser's
    // automatic favicon request always 404s there; that is harness noise, not a product bug.
    if (/failed to load resource/i.test(text) && /favicon\.ico/i.test(msg.location().url)) return;
    errors.push(`console.error: ${text} (${msg.location().url})`);
  });
}

test.describe('GiftCraft dashboard', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    attachConsoleCapture(page, consoleErrors);
    await page.goto('./');
  });

  test.afterEach(() => {
    expect(consoleErrors, `Unexpected console/page errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('dashboard mounts cleanly with heading, primary action, and active gift options', async ({ page }) => {
    await expect(page.getByText('GiftCraft: Gift Wrapping & Greeting Cards')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add gift option' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save configuration' })).toBeVisible();
    await expect(page.getByText('Classic Crimson Ribbon', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Luxury Velvet & Gold Embossed', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Active Gift Options', { exact: false })).toBeVisible();
  });

  test('all configured rows render with no page-number pagination control', async ({ page }) => {
    // This app's list is bounded (mock returns 2 options) - no "Load more" is expected.
    await expect(page.getByText('2 options', { exact: false })).toBeVisible();
    await expect(page.getByText('Classic Crimson Ribbon', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Luxury Velvet & Gold Embossed', { exact: true }).first()).toBeVisible();

    await expect(page.getByRole('button', { name: /load more/i })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: /pagination/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^\d+$/ })).toHaveCount(0);
    await expect(page.locator('[data-hook*="pagination" i]')).toHaveCount(0);
    await expect(page.getByText(/^page \d+ of \d+$/i)).toHaveCount(0);
  });

  test('add-gift-option modal shows its form fields and Cancel closes it', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add gift option' }).click();

    const modal = page.getByLabel('Add a gift-wrap option');
    await expect(page.getByText('Add a gift-wrap option', { exact: true })).toBeVisible();
    await expect(modal.getByPlaceholder('e.g. Classic Crimson Ribbon')).toBeVisible();
    await expect(modal.getByText('Wrap style', { exact: true })).toBeVisible();
    await expect(modal.getByText('Wrap fee', { exact: true })).toBeVisible();
    await expect(modal.getByText('Greeting message character limit', { exact: true })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Save gift option' })).toBeVisible();

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Add a gift-wrap option', { exact: true })).toBeHidden();
  });

  test('pro upgrade CTA is visible on the plan card for a free-plan instance', async ({ page }) => {
    await page.goto('./?plan=free');
    await expect(page.getByText('Plan & availability')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toBeVisible();
  });

  test('a paid instance shows the Pro-active state instead of an upgrade CTA', async ({ page }) => {
    await page.goto('./?plan=paid');
    await expect(page.getByText('Plan & availability')).toBeVisible();
    await expect(page.getByText('Pro plan active')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toHaveCount(0);
  });

  test('interactive checkout preview calculates fees and character validation', async ({ page }) => {
    await expect(page.getByText('Checkout Order Summary Preview')).toBeVisible();
    await expect(page.getByText('Shopper Cart Items')).toBeVisible();
    await expect(page.getByText('Personalized Greeting Message')).toBeVisible();
    await expect(page.getByText('Within Limit')).toBeVisible();
  });

  test('interactive checkout preview updates fees when switching gift options', async ({ page }) => {
    await expect(page.getByText('Gift wrapping (Classic Crimson Ribbon):', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Luxury Velvet & Gold Embossed ($9.99)' }).click();
    await expect(page.getByText('Gift wrapping (Luxury Velvet & Gold Embossed):', { exact: true })).toBeVisible();
  });

  test('search filter narrows visible rows in the gift options table', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search styles...');
    await expect(searchInput).toBeVisible();
    await expect(page.getByText('Classic Crimson Ribbon', { exact: true })).toBeVisible();
    await expect(page.getByText('Luxury Velvet & Gold Embossed', { exact: true }).first()).toBeVisible();

    await searchInput.fill('Luxury');
    await expect(page.getByText('Luxury Velvet & Gold Embossed', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Classic Crimson Ribbon', { exact: true })).toBeHidden();

    await searchInput.fill('');
    await expect(page.getByText('Classic Crimson Ribbon', { exact: true })).toBeVisible();
  });

  test('actionable storage recovery UI renders when storage is unverified', async ({ page }) => {
    await page.goto('./?storage=unverified');
    await expect(page.getByText('Setup needed before you can save gift options')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('dashboard renders in German when ?lang=de is set', async ({ page }) => {
    await page.goto('./?lang=de');
    await expect(page.getByText('GiftCraft: Geschenkverpackung & Grußkarten')).toBeVisible();
  });

  test('main dashboard screenshot for the record', async ({ page }) => {
    await expect(page.getByText('GiftCraft: Gift Wrapping & Greeting Cards')).toBeVisible();
    await expect(page.getByText('Luxury Velvet & Gold Embossed', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: 'artifacts/dashboard-main.png', fullPage: true });
  });
});
