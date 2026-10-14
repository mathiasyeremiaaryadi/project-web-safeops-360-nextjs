import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginViaForm } from './support/mock-go.js';

/**
 * Signs in as a user who must change the password (never submitted, so tests stay parallel-safe).
 * @param {import('@playwright/test').Page} page
 */
async function openChangePassword(page) {
  await page.goto('/login');
  await loginViaForm(page, 'sari.wulandari', 'Sementara1');
  await expect(page).toHaveURL(/\/change-password$/);
}

const WIDTHS = [360, 640, 768, 1024, 1280, 1536];
const HEIGHT = 900;

/** @param {import('@playwright/test').Page} page */
async function expectNoHorizontalScroll(page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

/**
 * Simulates the browser's `beforeinstallprompt` so the PWA invitation renders.
 * @param {import('@playwright/test').Page} page
 */
async function triggerInstallPrompt(page) {
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: () => {},
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(event);
  });
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test('/login layout', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Masuk ke SafeOps 360' })).toBeVisible();
      await triggerInstallPrompt(page);
      await expect(page.getByRole('button', { name: 'Pasang' })).toBeVisible();

      await expectNoHorizontalScroll(page);
      const brandPanel = page.getByTestId('login-brand-panel');
      if (width >= 1024) {
        await expect(brandPanel).toBeVisible();
      } else {
        await expect(brandPanel).toBeHidden();
      }

      // Bottom sheet only on XS; inline row from SM up.
      await expect(page.getByRole('button', { name: 'Nanti' })).toBeVisible({
        visible: width < 640,
      });

      // Touch targets ≥ 44px and 16px input text (no iOS zoom).
      const username = page.getByLabel('Username');
      const usernameBox = await username.boundingBox();
      expect(usernameBox?.height).toBeGreaterThanOrEqual(44);
      expect(await username.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
      const submitBox = await page.getByRole('button', { name: 'Masuk' }).boundingBox();
      expect(submitBox?.height).toBeGreaterThanOrEqual(44);

      await page.screenshot({
        path: `tests/e2e/__screenshots__/login-${width}.png`,
        fullPage: true,
      });
    });

    test('/change-password layout', async ({ page }) => {
      await openChangePassword(page);
      await expect(page.getByRole('heading', { name: 'Buat password baru' })).toBeVisible();
      await page.getByLabel('Password sementara').fill('Sementara1');
      await page.getByLabel('Password baru', { exact: true }).fill('rahasiab');

      await expectNoHorizontalScroll(page);
      await expect(page.getByTestId('login-brand-panel')).toHaveCount(0);
      await page.screenshot({
        path: `tests/e2e/__screenshots__/change-password-${width}.png`,
        fullPage: true,
      });
    });
  });
}

test.describe('accessibility (axe)', () => {
  /** @param {import('axe-core').Result[]} violations */
  const seriousOrCritical = (violations) =>
    violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);

  for (const width of [360, 1280]) {
    test(`/login at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.goto('/login');
      await triggerInstallPrompt(page);
      // Include the error state.
      await page.getByLabel('Username').fill('budi.santoso');
      await page.getByLabel('Password', { exact: true }).fill('salah');
      await page.getByRole('button', { name: 'Masuk' }).click();
      await expect(page.locator('#login-error')).toBeVisible();
      await page.waitForTimeout(300); // let the reveal transition finish

      const results = await new AxeBuilder({ page }).analyze();
      expect(seriousOrCritical(results.violations)).toEqual([]);
    });

    test(`/change-password at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await openChangePassword(page);
      await page.getByLabel('Password baru', { exact: true }).fill('abc12345');

      const results = await new AxeBuilder({ page }).analyze();
      expect(seriousOrCritical(results.violations)).toEqual([]);
    });
  }
});
