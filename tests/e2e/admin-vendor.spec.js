import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  ADMIN_VENDOR_ONE_SITE,
  ADMIN_VENDOR_TWO_SITES,
  VENDOR_SCOPES,
} from './support/fixtures.js';
import { mockApi } from './support/mock-api.js';

/*
 * Role Admin vendor (ADMIN_WORKER): runs their own vendor's operations on the same pages as the
 * other roles — reviews, inventory, SOP, the tasks of their pipelines and Worker accounts. The
 * mock API filters data to the vendor and refuses what the BRD reserves to other roles.
 */

/** Rina — PT Bersih Jaya, serving PLTU Paiton and PLTU Pacitan. */
const signInAsRina = (page) =>
  mockApi(page, { user: ADMIN_VENDOR_TWO_SITES, vendorScope: VENDOR_SCOPES.v1 });

/** Dimas — PT Karya Aman, serving one site. */
const signInAsDimas = (page) =>
  mockApi(page, { user: ADMIN_VENDOR_ONE_SITE, vendorScope: VENDOR_SCOPES.v2 });

/** @param {import('@playwright/test').Page} page */
const dialog = (page) => page.getByRole('dialog');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('menu, vendor label and "Progres per pipeline" on the dashboard', async ({ page }) => {
  await signInAsRina(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link')).toHaveText([
    'Beranda',
    'Progress pipeline',
    'Review laporan',
    'Laporan inventory',
    'SLA & maturity',
    'Inventory',
    'SOP',
    'Pipeline item',
    'Penugasan worker',
    'Akun worker',
    'Profil & sesi',
  ]);
  await expect(page.getByLabel('Konteks data: PT Bersih Jaya · 2 site')).toBeVisible();
  await expect(page.locator('main').getByText(/^PT Bersih Jaya · [A-Z][a-z]+, /)).toBeVisible();

  const progress = page.getByRole('region', { name: 'Progres per pipeline' });
  await expect(progress.getByText('Cleaning Turbine Hall')).toBeVisible();
  await expect(progress.getByText('Cleaning Admin Building')).toBeVisible();
  // Two sites: a site filter; never a vendor filter.
  await expect(page.getByRole('combobox', { name: 'Filter site' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Filter vendor' })).toHaveCount(0);
});

test('a one-site vendor has no site filter', async ({ page }) => {
  await signInAsDimas(page);
  await page.goto('/dashboard');
  await expect(page.getByLabel('Konteks data: PT Karya Aman · PLTGU Grati')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Filter site' })).toHaveCount(0);
  await page.goto('/reports/tasks');
  await expect(page.getByRole('combobox', { name: 'Filter site' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Filter vendor' })).toHaveCount(0);
});

test('review: approve one report, request a revision with a reason; no rejection without one', async ({
  page,
}) => {
  const api = await signInAsRina(page);
  await page.goto('/reports/tasks');
  await expect(page.getByText('Laporan dari worker PT Bersih Jaya.')).toBeVisible();
  await page
    .getByRole('link', { name: /Sapu dan pel lantai/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Setujui' }).click();
  await dialog(page).getByRole('button', { name: 'Setujui' }).click();
  await expect(page).toHaveURL(/\/reports\/tasks$/);

  await page
    .getByRole('link', { name: /Lap panel/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Tolak' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Tolak' })).toBeDisabled();
  await dialog(page).getByRole('button', { name: 'Batal' }).click();
  await page.getByRole('button', { name: 'Minta revisi' }).click();
  await dialog(page).getByLabel('Alasan').fill('Foto sesudah belum ada.');
  await dialog(page).getByRole('button', { name: 'Minta revisi' }).click();
  await expect(page).toHaveURL(/\/reports\/tasks$/);
  expect(api.writes.map((w) => w.body)).toEqual([
    { status: 'COMPLETED' },
    { revision_status: 'REQUESTED', reason: 'Foto sesudah belum ada.' },
  ]);
});

test('inventory report: opens on "Baru", then Baru → Diperiksa → Disetujui → Selesai', async ({
  page,
}) => {
  const api = await signInAsRina(page);
  await page.goto('/reports/inventory');
  await expect(page.getByRole('button', { name: 'Baru' })).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('link', { name: /Selang APAR retak/ })
    .first()
    .click();
  for (const label of ['Tandai sedang diperiksa', 'Setujui', 'Tandai selesai']) {
    await page.getByRole('button', { name: label }).click();
    await dialog(page).getByRole('button', { name: label }).click();
    await expect(dialog(page)).toBeHidden();
  }
  expect(api.writes.map((w) => w.body.status)).toEqual(['IN_REVIEW', 'APPROVED', 'RESOLVED']);
});

test('inventory: add (own vendor, no vendor field), edit quantity, deactivate', async ({
  page,
}) => {
  const api = await signInAsRina(page);
  await page.goto('/inventories');
  await page.getByRole('button', { name: 'Tambah inventory' }).click();
  await expect(dialog(page).getByRole('combobox', { name: /vendor/i })).toHaveCount(0);
  await dialog(page).getByLabel('Nama item').fill('Tangga lipat');
  await dialog(page).getByLabel('Jenis item').fill('Alat kerja');
  await dialog(page).getByLabel('Jumlah', { exact: true }).fill('3');
  await dialog(page).getByLabel('Kondisi', { exact: true }).selectOption('GOOD');
  await dialog(page).getByRole('button', { name: 'Simpan inventory' }).click();
  await expect(page.getByText('Inventory berhasil disimpan.')).toBeVisible();
  expect(api.writes[0]).toMatchObject({
    method: 'POST',
    body: { vendor_id: 'v1', item: 'Tangga lipat' },
  });

  await page.goto('/inventories/n1');
  await page.getByRole('button', { name: 'Edit' }).click();
  await dialog(page).getByLabel('Jumlah', { exact: true }).fill('10');
  await dialog(page).getByRole('button', { name: 'Simpan inventory' }).click();
  await expect(dialog(page)).toBeHidden();
  await page.getByRole('button', { name: 'Nonaktifkan' }).click();
  await dialog(page).getByRole('button', { name: 'Nonaktifkan' }).click();
  await expect(page.getByText('Status inventory berhasil diubah.')).toBeVisible();
  expect(api.writes.map((w) => `${w.method} ${w.path}`)).toEqual([
    'POST /inventories',
    'PATCH /inventories/n1',
    'DELETE /inventories/n1',
  ]);
});

test('SOP: upload a PDF for the own vendor, then open it', async ({ page, context }) => {
  const api = await signInAsRina(page);
  await context.route('http://localhost/e2e-files/**', (route) =>
    route.fulfill({ contentType: 'text/plain', body: 'pdf' }),
  );
  await page.goto('/policies');
  await page.getByRole('button', { name: 'Upload SOP' }).click();
  await expect(dialog(page).getByRole('combobox', { name: /vendor/i })).toHaveCount(0);
  await dialog(page).getByLabel('Nama SOP', { exact: true }).fill('SOP APD');
  await dialog(page)
    .locator('input[type=file]')
    .setInputFiles({
      name: 'sop.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    });
  await dialog(page).getByRole('button', { name: 'Upload SOP' }).click();
  await expect(page.getByText('SOP berhasil disimpan.')).toBeVisible();
  expect(api.writes[0]).toMatchObject({
    method: 'POST',
    path: '/policies',
    body: { vendor_id: 'v1', name: 'SOP APD', file: { file: 'sop.pdf' } },
  });

  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Buka SOP Kerja di Ketinggian' }).click(),
  ]);
  await expect.poll(() => tab.url()).toContain('/e2e-files/q1.pdf');
});

test('pipeline item: read-only pipelines, tasks can be added, moved and deactivated', async ({
  page,
}) => {
  const api = await signInAsRina(page);
  await page.goto('/pipelines');
  await expect(page.getByRole('heading', { name: 'Pipeline item', level: 1 })).toBeVisible();
  await expect(page.getByText('Atur task di pipeline vendor Anda.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buat pipeline' })).toHaveCount(0);

  await page.goto('/pipelines/p1');
  await expect(page.getByText('Sapu dan pel lantai')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit pipeline' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Tambah task ke pipeline' }).click();
  await page.getByRole('option', { name: /Lap panel/ }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  await page.getByRole('button', { name: 'Naikkan Lap panel' }).click();
  await expect.poll(() => api.writes.length).toBe(3);
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Sapu dan pel lantai' })
    .getByRole('button', { name: 'Nonaktifkan' })
    .click();
  await expect.poll(() => api.writes.length).toBe(4);
  expect(api.writes.map((w) => `${w.method} ${w.path}`)).toEqual([
    'POST /pipelines/p1/items',
    'PATCH /pipeline-items/pi2',
    'PATCH /pipeline-items/pi1',
    'PATCH /pipeline-items/pi1',
  ]);
});

test('worker accounts: create a Worker, reset the password once, deactivate', async ({ page }) => {
  const api = await signInAsRina(page);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Akun worker', level: 1 })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Filter role' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: /Scope/ })).toHaveCount(0);

  await page.getByRole('link', { name: 'Tambah worker' }).click();
  await expect(page.getByText('Akun ini akan menjadi Worker di PT Bersih Jaya.')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByLabel('Nama lengkap').fill('Joko Susilo');
  await page.getByLabel('Username').fill('joko.susilo');
  await page.getByRole('button', { name: 'Simpan user' }).click();
  await expect(page.getByRole('status', { name: 'Password sementara' })).toHaveText('Tmp-Passw0rd');
  expect(api.writes[0].body).toMatchObject({ roles: ['WORKER'], vendor_ids: ['v1'], site_ids: [] });
  await page.getByRole('button', { name: 'Selesai' }).click();

  await expect(page).toHaveURL(/\/users\/u-new$/);
  await expect(page.getByRole('button', { name: 'Cabut semua sesi' })).toHaveCount(0);
  await expect(page.getByText('Role & scope')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await dialog(page).getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('status', { name: 'Password sementara' })).toHaveText(
    'Reset-Passw0rd',
  );
  await page.getByRole('button', { name: 'Selesai' }).click();
  await page.getByRole('button', { name: 'Nonaktifkan user' }).click();
  await dialog(page).getByRole('button', { name: 'Nonaktifkan user' }).click();
  await expect(page.getByText('User dinonaktifkan.')).toBeVisible();
});

test("isolation: other vendors' records are not found; master and audit log are 403", async ({
  page,
}) => {
  await signInAsRina(page);
  await page.goto('/inventories/n2');
  await expect(page.getByText('Data tidak ditemukan')).toBeVisible();
  await page.goto('/reports/inventory/ir2');
  await expect(page.getByText('Laporan tidak ditemukan')).toBeVisible();
  for (const path of ['/master', '/audit-logs']) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'Anda tidak memiliki akses ke halaman ini.' }),
    ).toBeVisible();
  }
});

test('profile shows the vendor and the sites it serves', async ({ page }) => {
  await signInAsRina(page);
  await page.goto('/profile');
  await expect(page.locator('main').getByText('PT Bersih Jaya', { exact: true })).toBeVisible();
  const sites = page.getByLabel('Site yang dikelola');
  await expect(sites).toContainText('PLTU Paiton');
  await expect(sites).toContainText('PLTU Pacitan');
});

const PAGES = ['/dashboard', '/reports/tasks', '/inventories', '/users'];

for (const width of [360, 640, 768, 1024, 1280, 1536]) {
  test(`Admin vendor pages at ${width}px: no horizontal scroll, navigation per breakpoint`, async ({
    page,
  }) => {
    await signInAsRina(page);
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${path} scrolls horizontally`).toBeLessThanOrEqual(0);
    }
    await page.goto('/dashboard');
    const bottomNav = page.getByRole('navigation', { name: 'Navigasi bawah' });
    if (width < 768) {
      await expect(bottomNav.getByRole('link')).toHaveText([
        'Beranda',
        'Review',
        'Lap. inv.',
        'Inventory',
        'Profil',
      ]);
    } else {
      await expect(bottomNav).toBeHidden();
    }
    await page.screenshot({
      path: `tests/e2e/__screenshots__/admin-vendor-dashboard-${width}.png`,
      fullPage: true,
    });
  });
}

for (const width of [360, 1280]) {
  test(`Admin vendor pages have no serious accessibility violations at ${width}px`, async ({
    page,
  }) => {
    await signInAsRina(page);
    await page.setViewportSize({ width, height: 900 });
    /** @type {string[]} */
    const serious = [];
    for (const path of PAGES) {
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

test('progress per pipeline: today by default, from "Rekap lengkap", row opens the pipeline', async ({
  page,
}) => {
  await signInAsRina(page);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Rekap lengkap' }).click();
  await expect(page).toHaveURL(/\/pipeline-progress$/);
  await expect(page.getByRole('heading', { name: 'Progress pipeline', level: 1 })).toBeVisible();

  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(3);
  const turbine = table.getByRole('row').filter({ hasText: 'Cleaning Turbine Hall' });
  await expect(turbine).toContainText('67%');
  await page.getByRole('searchbox').fill('admin');
  await expect(table.getByRole('row')).toHaveCount(2);
  await page.getByRole('searchbox').fill('');
  await expect(table.getByRole('row')).toHaveCount(3);

  // Site filter: sent to the API and applied here too (the API may ignore it).
  await page.getByRole('combobox', { name: 'Filter site' }).click();
  await page.getByRole('option', { name: /PLTU Pacitan/ }).click();
  await expect(page).toHaveURL(/site_id=s4/);
  await expect(table.getByRole('row').filter({ hasText: 'Cleaning Turbine Hall' })).toHaveCount(0);
  await expect(table.getByRole('row').filter({ hasText: 'Cleaning Admin Building' })).toHaveCount(
    1,
  );
  await page.getByRole('combobox', { name: 'Filter site' }).click();
  await page.getByRole('option', { name: /PLTU Paiton/ }).click();
  await expect(turbine).toContainText('PLTU Paiton');
  await turbine.click();
  await expect(page).toHaveURL(/\/pipelines\/p1$/);
});

test('worker assignments: active by default, assign a worker, deactivate one', async ({ page }) => {
  const api = await signInAsRina(page);
  await page.goto('/assignments');
  await expect(page.getByRole('heading', { name: 'Penugasan worker', level: 1 })).toBeVisible();
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('Sapu dan pel lantai');
  await page.getByRole('button', { name: 'Nonaktif', exact: true }).click();
  await expect(table).toContainText('Lap panel');

  await page.getByRole('button', { name: 'Tambah penugasan' }).click();
  const form = dialog(page);
  await expect(form.getByRole('combobox', { name: 'Task' })).toBeDisabled();
  await form.getByRole('button', { name: 'Tugaskan' }).click();
  await expect(form.getByText('Pipeline wajib dipilih.')).toBeVisible();
  await form.getByRole('combobox', { name: 'Pipeline' }).click();
  await page.getByRole('option', { name: /Cleaning Turbine Hall/ }).click();
  await form.getByRole('combobox', { name: 'Task' }).selectOption({ label: '2. Lap panel' });
  await form.getByRole('combobox', { name: 'Worker' }).click();
  await page.getByRole('option', { name: /Agus Pratama/ }).click();
  await form.getByRole('button', { name: 'Tugaskan' }).click();
  await expect(page.getByText('Worker berhasil ditugaskan.')).toBeVisible();
  expect(api.writes.find((w) => w.path === '/assignments')).toMatchObject({
    method: 'POST',
    body: { pipeline_item_id: 'pi2', user_id: 'u1' },
  });

  await page.getByRole('button', { name: 'Aktif', exact: true }).click();
  await table
    .getByRole('row')
    .filter({ hasText: 'Sapu dan pel lantai' })
    .getByRole('button', { name: 'Nonaktifkan' })
    .click();
  await dialog(page).getByRole('button', { name: 'Nonaktifkan' }).click();
  await expect(page.getByText('Penugasan dinonaktifkan.')).toBeVisible();
  expect(api.writes.at(-1)).toMatchObject({
    method: 'PATCH',
    path: '/assignments/as1',
    body: { is_active: false },
  });
});
