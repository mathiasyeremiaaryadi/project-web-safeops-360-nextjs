import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/*
 * Layout and accessibility of the login page at every breakpoint. Pages behind login are not
 * covered here: there is no mock backend, and E2E must not sign in to the real Go backend.
 */

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
  test(`/login layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: HEIGHT });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Masuk ke SafeOps 360' })).toBeVisible();
    await triggerInstallPrompt(page);
    await expect(
      page.getByRole('button', { name: 'Pasang' }).filter({ visible: true }),
    ).toBeVisible();

    await expectNoHorizontalScroll(page);
    const brandPanel = page.getByTestId('login-brand-panel');
    if (width >= 1024) await expect(brandPanel).toBeVisible();
    else await expect(brandPanel).toBeHidden();

    // Bottom sheet only on XS; inline row from SM up.
    await expect(page.getByRole('button', { name: 'Nanti' })).toBeVisible({ visible: width < 640 });

    // Touch targets ≥ 44px and 16px input text (no iOS zoom).
    const username = page.getByLabel('Username');
    expect((await username.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await username.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
    expect(
      (await page.getByRole('button', { name: 'Masuk' }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);

    await page.screenshot({ path: `tests/e2e/__screenshots__/login-${width}.png`, fullPage: true });
  });
}

for (const width of [360, 1280]) {
  test(`/login has no serious accessibility violations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: HEIGHT });
    await page.goto('/login');
    await triggerInstallPrompt(page);
    // Include the validation error state.
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.getByText('Username wajib diisi')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.help}`);
    expect(serious).toEqual([]);
  });
}
