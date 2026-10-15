import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './support/mock-api.js';

/*
 * Every signed-in page, against the mock API: renders without errors, has no horizontal scroll,
 * uses the right navigation for the width, and has no serious accessibility violations.
 */

const PAGES = [
  { path: '/dashboard', heading: 'Rekap harian' },
  { path: '/reports/tasks', heading: 'Review laporan' },
  { path: '/reports/tasks/r1', heading: 'Sapu dan pel lantai' },
  { path: '/master?tab=sites', heading: 'Site & vendor' },
  { path: '/master?tab=vendors', heading: 'Site & vendor' },
  { path: '/master?tab=items', heading: 'Site & vendor' },
  { path: '/pipelines', heading: 'Pipeline & task' },
  { path: '/pipelines/p1', heading: 'Cleaning Turbine Hall' },
  { path: '/inventories', heading: 'Inventory' },
  { path: '/inventories/n1', heading: 'APAR 6 kg' },
  { path: '/policies', heading: 'SOP' },
  { path: '/reports/inventory', heading: 'Laporan inventory' },
  { path: '/reports/inventory/ir1', heading: /Kerusakan/ },
  { path: '/users', heading: 'Manajemen user' },
  { path: '/users/new', heading: 'Tambah user' },
  { path: '/users/u1', heading: 'Agus Pratama' },
  { path: '/audit-logs', heading: 'Audit log' },
  { path: '/profile', heading: /Profil/ },
];

/**
 * Errors that are not caused by the page under test. The config blocks service workers
 * (`serviceWorkers: 'block'`), which makes `navigator.serviceWorker.register()` resolve to
 * undefined — something real browsers never do — and the Serwist client then reads `.waiting`
 * on it.
 */
const IGNORED_ERRORS = [/Download the React DevTools/, /reading 'waiting'/];

/** @param {import('@playwright/test').Page} page */
function collectErrors(page) {
  const errors = [];
  const ignored = (/** @type {string} */ text) => IGNORED_ERRORS.some((re) => re.test(text));
  page.on('pageerror', (error) => {
    if (!ignored(error.message)) errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !ignored(message.text())) errors.push(message.text());
  });
  return errors;
}

/** @param {import('@playwright/test').Page} page */
async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

for (const width of [360, 768, 1280, 1536]) {
  test(`every page renders cleanly at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await mockApi(page);
    const errors = collectErrors(page);
    await page.setViewportSize({ width, height: 900 });

    for (const { path, heading } of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, level: 1 }), path).toBeAttached();
      await expect(page.getByText('Data gagal dimuat.'), path).toHaveCount(0);
      expect(await horizontalOverflow(page), `${path} scrolls horizontally`).toBeLessThanOrEqual(0);
    }

    // Navigation per breakpoint: bottom nav < 768, rail 768–1023, sidebar ≥ 1024.
    await page.goto('/dashboard');
    const bottomNav = page.getByRole('navigation', { name: 'Navigasi bawah' });
    const sidebar = page.getByRole('navigation', { name: 'Menu utama' });
    if (width < 768) await expect(bottomNav).toBeVisible();
    else await expect(bottomNav).toBeHidden();
    if (width >= 1024) await expect(sidebar).toBeVisible();

    await page.screenshot({
      path: `tests/e2e/__screenshots__/dashboard-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

for (const width of [360, 1280]) {
  test(`no serious accessibility violations at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await mockApi(page);
    await page.setViewportSize({ width, height: 900 });
    /** @type {string[]} */
    const serious = [];
    for (const path of [
      '/dashboard',
      '/users',
      '/reports/tasks',
      '/reports/inventory/ir1',
      '/inventories',
      '/audit-logs',
      '/master?tab=vendors',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).analyze();
      for (const v of results.violations) {
        if (v.impact === 'serious' || v.impact === 'critical')
          serious.push(`${path} ${v.id}: ${v.help}`);
      }
    }
    expect(serious).toEqual([]);
  });
}
