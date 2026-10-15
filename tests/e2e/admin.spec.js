import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADMIN_PAITON, ADMIN_TWO_SITES } from './support/fixtures.js';
import { mockApi } from './support/mock-api.js';

/*
 * Role Admin (Admin Site): same pages as Super Admin, but the menu, the allowed actions and the
 * site context follow the role. The mock API returns only the Admin's site, like the backend.
 */

/** @param {import('@playwright/test').Page} page */
async function signInAsAdmin(page) {
  const api = await mockApi(page, { user: ADMIN_PAITON });
  // Backend scope: an Admin only gets their own site.
  api.data.sites = api.data.sites.filter((site) => site.id === 's1');
  return api;
}

/** @param {import('@playwright/test').Page} page */
async function signInAsTwoSiteAdmin(page) {
  const api = await mockApi(page, { user: ADMIN_TWO_SITES });
  api.data.sites = api.data.sites.filter((site) => ['s1', 's3'].includes(site.id));
  /** @type {string[]} */
  const requests = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request.url());
  });
  return { api, requests };
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('Admin sees the site menu with the site name, and no users or audit log', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/dashboard');
  const menu = page.getByRole('navigation', { name: 'Menu utama' });
  await expect(menu.getByRole('link')).toHaveText([
    'Beranda',
    'Review laporan',
    'Laporan inventory',
    'Vendor',
    'Pipeline & task',
    'Inventory',
    'SOP',
    'Profil & sesi',
  ]);
  await expect(menu.getByText('Data site')).toBeVisible();
  await expect(page.getByLabel('Konteks data: PLTU Paiton')).toBeVisible();
});

test('Admin dashboard: same panels, no site filter, site name in the subtitle', async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto('/dashboard');
  await expect(page.getByText(/^PLTU Paiton · /)).toBeVisible();
  await expect(page.getByText('Total task', { exact: true })).toBeVisible();
  await expect(page.getByText('Progres per vendor')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Filter site' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Filter vendor' })).toBeVisible();
});

test('Admin sees "Vendor": only Vendor and Master task tabs, read only', async ({ page }) => {
  const { requests } = await signInAsTwoSiteAdmin(page);
  await page.goto('/master');
  await expect(page.getByRole('heading', { name: 'Vendor', level: 1 })).toBeVisible();
  await expect(
    page.getByText('Vendor yang bekerja di site Anda dan master task yang dipakai.'),
  ).toBeVisible();
  await expect(page.getByRole('tab')).toHaveText(['Vendor', 'Master task']);
  await expect(page.getByRole('tab', { name: 'Vendor' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Vendor');

  await page.getByRole('button', { name: /^Konteks data: Semua site saya/ }).click();
  await page.getByRole('menuitemradio', { name: 'PLTU Paiton' }).click();
  await page.getByRole('tab', { name: 'Master task' }).click();
  await expect(page.getByRole('cell', { name: 'Lap panel' })).toBeVisible();
  await expect.poll(() => requests.some((url) => /items\?.*site_id=s1/.test(url))).toBe(true);
  await expect(page.getByRole('button', { name: /^Tambah/ })).toHaveCount(0);
});

test('Admin reads vendors without add/edit/deactivate', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/master?tab=vendors');
  await expect(page.getByRole('cell', { name: 'PT Bersih Jaya' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Tambah/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(Edit|Nonaktifkan|Aktifkan) / })).toHaveCount(0);
});

test('Admin reads inventory reports without review buttons', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/reports/inventory/ir1');
  await expect(page.getByText('Status laporan diperbarui oleh Admin Worker vendor.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Setujui|Tolak|Tandai/ })).toHaveCount(0);
});

test('Admin may review task reports and create pipelines', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/reports/tasks/r1');
  await expect(page.getByRole('button', { name: 'Setujui' })).toBeVisible();
  await page.goto('/pipelines');
  await expect(page.getByRole('button', { name: 'Buat pipeline' })).toBeVisible();
});

test('Admin opening the audit log or user management gets the 403 page', async ({ page }) => {
  await signInAsAdmin(page);
  for (const path of ['/audit-logs', '/users']) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'Anda tidak memiliki akses ke halaman ini.' }),
    ).toBeVisible();
  }
});

for (const width of [360, 640, 768, 1024, 1280, 1536]) {
  test(`Admin pages at ${width}px: no horizontal scroll, site switcher per breakpoint`, async ({
    page,
  }) => {
    await signInAsTwoSiteAdmin(page);
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/dashboard', '/pipelines', '/master']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${path} scrolls horizontally`).toBeLessThanOrEqual(0);
    }
    await page.goto('/dashboard');
    // One visible switcher: top bar (< 768), header (768–1023) or sidebar (≥ 1024).
    await expect(
      page
        .getByRole('button', { name: /^Konteks data: Semua site saya/ })
        .filter({ visible: true }),
    ).toHaveCount(1);
    await page.screenshot({
      path: `tests/e2e/__screenshots__/admin-dashboard-${width}.png`,
      fullPage: true,
    });
  });
}

for (const width of [360, 1280]) {
  test(`Admin pages have no serious accessibility violations at ${width}px`, async ({ page }) => {
    await signInAsTwoSiteAdmin(page);
    await page.setViewportSize({ width, height: 900 });
    /** @type {string[]} */
    const serious = [];
    for (const path of ['/dashboard', '/pipelines', '/master']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).analyze();
      for (const v of results.violations) {
        if (v.impact === 'serious' || v.impact === 'critical') {
          serious.push(`${path} ${v.id}: ${v.help}`);
        }
      }
    }
    expect(serious).toEqual([]);
  });
}

test('two-site Admin switches the site: label, site_id and numbers follow', async ({ page }) => {
  const { requests } = await signInAsTwoSiteAdmin(page);
  await page.goto('/dashboard');
  const switcher = page.getByRole('button', { name: /^Konteks data: Semua site saya/ });
  await expect(switcher).toBeVisible();
  await expect(page.getByText(/^Semua site saya · /)).toBeVisible();
  await expect(page.getByText('Total task', { exact: true }).locator('..')).toHaveText(
    'Total task48',
  );

  await switcher.click();
  await page.getByRole('menuitemradio', { name: 'PLTU Suralaya' }).click();
  await expect(page.getByText(/^PLTU Suralaya · /)).toBeVisible();
  await expect(page.getByText('Total task', { exact: true }).locator('..')).toHaveText(
    'Total task12',
  );
  const progress = page.getByRole('region', { name: 'Progres per vendor' });
  await expect(progress.getByText('PT Karya Aman')).toBeVisible();
  await expect(progress.getByText('PT Bersih Jaya')).toHaveCount(0);
  expect(requests.some((url) => /dashboard\/report\?.*site_id=s3/.test(url))).toBe(true);

  // Lists of the same session use the chosen site too.
  await page.getByRole('link', { name: 'Inventory', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Filter site' })).toHaveCount(0);
  await expect.poll(() => requests.some((url) => /inventories\?.*site_id=s3/.test(url))).toBe(true);
});

test('two-site Admin on a phone picks the site from the top bar', async ({ page }) => {
  await signInAsTwoSiteAdmin(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /^Konteks data: Semua site saya/ }).click();
  await page.getByRole('button', { name: 'PLTU Paiton' }).click();
  await expect(page.getByRole('button', { name: /^Konteks data: PLTU Paiton/ })).toBeVisible();
  await expect(page.getByText(/^PLTU Paiton · /)).toBeVisible();
});

test('Admin forms only offer vendors of the active site and explain out-of-scope errors', async ({
  page,
}) => {
  const { requests } = await signInAsTwoSiteAdmin(page);
  await page.route('**/api/v1/pipelines', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 403, contentType: 'application/json', body: '{}' })
      : route.fallback(),
  );
  await page.goto('/pipelines');
  await page.getByRole('button', { name: /^Konteks data: Semua site saya/ }).click();
  await page.getByRole('menuitemradio', { name: 'PLTU Paiton' }).click();
  await page.getByRole('button', { name: 'Buat pipeline' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: /vendor/i }).click();
  await expect
    .poll(() => requests.some((url) => /vendors\?.*status=ACTIVE.*site_id=s1/.test(url)))
    .toBe(true);
  await page.getByRole('option', { name: /Bersih Jaya/ }).click();
  await dialog.getByLabel('Nama pipeline').fill('Cleaning Area Baru');
  await dialog.getByRole('button', { name: 'Simpan pipeline' }).click();
  await expect(dialog.getByText('Vendor ini tidak termasuk site Anda.')).toBeVisible();
});

test('isolation: records of another site show "not found"', async ({ page }) => {
  await signInAsAdmin(page);
  for (const path of ['**/api/v1/inventories/n2', '**/api/v1/inventory-reports/ir2']) {
    await page.route(path, (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
    );
  }
  await page.goto('/inventories/n2');
  await expect(page.getByText('Data tidak ditemukan')).toBeVisible();
  await page.goto('/reports/inventory/ir2');
  await expect(page.getByText('Laporan tidak ditemukan')).toBeVisible();
});

test('Admin profile lists the managed sites', async ({ page }) => {
  await signInAsTwoSiteAdmin(page);
  await page.goto('/profile');
  const chips = page.getByLabel('Site yang dikelola');
  await expect(chips).toContainText('PLTU Paiton');
  await expect(chips).toContainText('PLTU Suralaya');
});

test.describe('site name when GET /sites fails for the Admin', () => {
  /** @param {import('@playwright/test').Page} page */
  async function failSiteList(page) {
    await page.route(/\/api\/v1\/sites\?/, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
  }

  test('uses the site names sent by /auth/me', async ({ page }) => {
    await mockApi(page, {
      user: { ...ADMIN_PAITON, scopes: undefined, sites: [{ id: 's3', name: 'PLTU Suralaya' }] },
    });
    await failSiteList(page);
    await page.goto('/dashboard');
    await expect(page.getByLabel('Konteks data: PLTU Suralaya')).toBeVisible();
    await expect(page.getByText(/^PLTU Suralaya · /)).toBeVisible();
  });

  test('looks up the name of each site id from /auth/me', async ({ page }) => {
    await mockApi(page, { user: { ...ADMIN_PAITON, scopes: { site_ids: ['s3'] } } });
    await failSiteList(page);
    await page.goto('/dashboard');
    await expect(page.getByLabel('Konteks data: PLTU Suralaya')).toBeVisible();
    await expect(page.getByText('Sesuai scope akun')).toHaveCount(0);
  });
});

test('Pipeline & task and SOP follow the active site too', async ({ page }) => {
  const { requests } = await signInAsTwoSiteAdmin(page);
  await page.goto('/pipelines');
  await page.getByRole('button', { name: /^Konteks data: Semua site saya/ }).click();
  await page.getByRole('menuitemradio', { name: 'PLTU Suralaya' }).click();
  await expect.poll(() => requests.some((url) => /pipelines\?.*site_id=s3/.test(url))).toBe(true);
  await expect(page.getByRole('button', { name: 'Buat pipeline' })).toBeVisible();

  await page.getByRole('link', { name: 'SOP', exact: true }).click();
  await expect.poll(() => requests.some((url) => /policies\?.*site_id=s3/.test(url))).toBe(true);
  await expect(page.getByRole('button', { name: 'Upload SOP' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter vendor' }).click();
  await expect.poll(() => requests.some((url) => /vendors\?.*site_id=s3/.test(url))).toBe(true);
});
