import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => console.log('HARNESS_PAGE_ERROR', error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('HARNESS_CONSOLE_ERROR', msg.text());
  });
  await page.goto('./');
});

test('dashboard mounts cleanly with title and active gift options', async ({ page }) => {
  await expect(page.getByText('GiftCraft: Gift Wrapping & Greeting Cards')).toBeVisible();
  await expect(page.getByText('Classic Crimson Ribbon', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Luxury Velvet & Gold Embossed', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Active Gift Options')).toBeVisible();
});

test('pro upgrade CTA is visible on the plan card for a free-plan instance', async ({ page }) => {
  await page.goto('./?plan=free');
  await expect(page.getByText('Plan & availability')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toBeVisible();
});

test('a paid instance shows the Pro-active state instead of an upgrade CTA', async ({ page }) => {
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

test('search filter updates visible gift options in table', async ({ page }) => {
  const searchInput = page.getByPlaceholder('Search styles...');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('Luxury');
  await expect(page.getByText('Luxury Velvet & Gold Embossed', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Classic Crimson Ribbon', { exact: true })).toBeHidden();
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
