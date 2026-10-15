import { expect, test } from '@playwright/test';
import { mockApi } from './support/mock-api.js';

/*
 * Main Super Admin flows against the in-browser mock API (support/mock-api.js): what the UI
 * shows and exactly what it sends. No request reaches the Go backend.
 */

test('Super Admin keeps "Site & vendor" with the Site, Vendor and Master task tabs', async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/master');
  await expect(page.getByRole('heading', { name: 'Site & vendor', level: 1 })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveText(['Site', 'Vendor', 'Master task']);
  await expect(page.getByRole('button', { name: 'Tambah site' })).toBeVisible();
});

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

/** @param {import('@playwright/test').Page} page */
const dialog = (page) => page.getByRole('dialog');

test('Beranda shows total / in progress / completed and the progress per vendor', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Rekap harian' })).toBeVisible();
  // Count panels, left to right: total, in progress, pending, completed.
  for (const [label, value] of [
    ['Total task', '48'],
    ['Dikerjakan', '4'],
    ['Pending', '6'],
    ['Selesai', '29'],
  ]) {
    await expect(page.getByText(label, { exact: true }).locator('..')).toHaveText(
      `${label}${value}`,
    );
  }
  await expect(
    page.locator('main').getByText(/^(Total task|Dikerjakan|Pending|Selesai)$/),
  ).toHaveText(['Total task', 'Dikerjakan', 'Pending', 'Selesai']);
  await expect(page.getByText('Menunggu review', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Revisi diminta', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('20 task · 14 selesai · 3 menunggu review · 1 revisi · 2 belum dikerjakan'),
  ).toBeVisible();
  await expect(page.getByText('Selang APAR retak.')).toBeVisible();
  // Super Admin keeps the site filter (an Admin does not have it).
  await expect(page.getByRole('combobox', { name: 'Filter site' })).toBeVisible();
  await expect(page.getByLabel('Konteks data: Semua site')).toBeVisible();
});

test('Beranda shows the safety notes of the day, newest first, filterable per category', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/dashboard');
  const panel = page.locator('section', {
    has: page.getByRole('heading', { name: 'Catatan safety' }),
  });
  const items = panel.getByRole('list', { name: 'Daftar catatan safety' }).getByRole('listitem');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('Near miss');
  await expect(items.first()).toContainText('Shift Sore · 16.30');
  await expect(items.first()).toContainText('PLTU Labuan · Coal Yard › Coal Stockpile');
  await expect(items.first()).toContainText('PT Bersih Jaya · Sinta Maharani');
  await expect(items.nth(1)).toContainText('Shift Pagi · 08.30–09.00');

  await panel.getByRole('button', { name: 'Unsafe condition (1)' }).click();
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Railing tangga longgar');
  await panel.getByRole('button', { name: 'Unsafe action (0)' }).click();
  await expect(panel.getByText('Tidak ada catatan untuk kategori ini.')).toBeVisible();
});

test('"Salin" copies the temporary password, also on plain HTTP (no Clipboard API)', async ({
  page,
}) => {
  // The app opened by IP over http: no secure context, so no navigator.clipboard.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'isSecureContext', { value: false });
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
    document.addEventListener('copy', () => {
      const field = /** @type {HTMLTextAreaElement} */ (document.activeElement);
      /** @type {any} */ (window).copiedText = field?.value ?? '';
    });
  });
  await mockApi(page);
  await page.goto('/users/new');
  await page.getByLabel('Nama lengkap').fill('Joko Susilo');
  await page.getByLabel('Username').fill('joko.susilo');
  await page.getByText('Worker', { exact: true }).click();
  await page.getByRole('combobox', { name: /vendor/i }).click();
  await page.getByRole('option', { name: /Bersih Jaya/ }).click();
  await page.getByRole('button', { name: 'Simpan user' }).click();

  await page.getByRole('button', { name: 'Salin' }).click();
  await expect(page.getByRole('button', { name: 'Tersalin' })).toBeVisible();
  expect(await page.evaluate(() => /** @type {any} */ (window).copiedText)).toBe('Tmp-Passw0rd');
});

test('create a Worker with a vendor, then reset the password (shown once)', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/users/new');
  await page.getByLabel('Nama lengkap').fill('Joko Susilo');
  await page.getByLabel('Username').fill('joko.susilo');
  await page.getByText('Worker', { exact: true }).click();
  await page.getByRole('combobox', { name: /vendor/i }).click();
  await page.getByRole('option', { name: /Bersih Jaya/ }).click();
  await page.getByRole('button', { name: 'Simpan user' }).click();

  await expect(page.getByRole('status', { name: 'Password sementara' })).toHaveText('Tmp-Passw0rd');
  const created = api.writes.find((w) => w.method === 'POST' && w.path === '/users');
  expect(created?.body).toMatchObject({ username: 'joko.susilo', roles: ['WORKER'] });
  await page.getByRole('button', { name: 'Selesai' }).click();
  await expect(page).toHaveURL(/\/users\/u-new$/);

  await page.getByRole('button', { name: 'Reset password' }).click();
  await dialog(page).getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('status', { name: 'Password sementara' })).toHaveText(
    'Reset-Passw0rd',
  );
  await page.getByRole('button', { name: 'Selesai' }).click();
  await expect(page.getByRole('status', { name: 'Password sementara' })).toBeHidden();
});

test('add a vendor with two sites, then deactivate it', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/master?tab=vendors');
  await page.getByRole('button', { name: 'Tambah vendor' }).click();
  await dialog(page).getByLabel('Kode').fill('SP');
  await dialog(page).getByLabel('Nama vendor').fill('PT Sinar Prima');
  const sites = dialog(page).getByRole('combobox', { name: /site/i });
  await sites.click();
  await page.getByRole('option', { name: /Paiton/ }).click();
  await page.getByRole('option', { name: /Grati/ }).click();
  await page.keyboard.press('Escape');
  await dialog(page).getByRole('button', { name: 'Simpan vendor' }).click();
  await expect(page.getByText('Vendor berhasil disimpan.')).toBeVisible();
  const created = api.writes.find((w) => w.method === 'POST' && w.path === '/vendors');
  expect(created?.body).toEqual({ code: 'SP', name: 'PT Sinar Prima', site_ids: ['s1', 's2'] });

  await page.getByRole('button', { name: 'Nonaktifkan PT Bersih Jaya' }).click();
  await dialog(page).getByRole('button', { name: 'Nonaktifkan' }).click();
  await expect(page.getByText('Status vendor berhasil diubah.')).toBeVisible();
  expect(api.writes).toContainEqual(
    expect.objectContaining({ method: 'DELETE', path: '/vendors/v1' }),
  );
});

test('review: approve one report, request a revision with a reason on another', async ({
  page,
}) => {
  const api = await mockApi(page);
  await page.goto('/reports/tasks');
  await page
    .getByRole('link', { name: /Sapu dan pel lantai/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/reports\/tasks\/r1$/);
  await expect(page.getByText('Lantai licin dekat pintu 3.')).toBeVisible();
  await page.getByRole('button', { name: 'Setujui' }).click();
  await dialog(page).getByRole('button', { name: 'Setujui' }).click();
  await expect(page).toHaveURL(/\/reports\/tasks$/);

  await page
    .getByRole('link', { name: /Lap panel/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Minta revisi' }).click();
  const confirm = dialog(page).getByRole('button', { name: 'Minta revisi' });
  await expect(confirm).toBeDisabled();
  await dialog(page).getByLabel('Alasan').fill('Foto sesudah belum ada.');
  await confirm.click();
  await expect(page).toHaveURL(/\/reports\/tasks$/);

  expect(api.writes).toEqual([
    { method: 'PATCH', path: '/pipeline-reports/r1', body: { status: 'COMPLETED' } },
    {
      method: 'PATCH',
      path: '/pipeline-reports/r2',
      body: { revision_status: 'REQUESTED', reason: 'Foto sesudah belum ada.' },
    },
  ]);
});

test('inventory report: Baru → Diperiksa → Disetujui → Selesai', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/reports/inventory/ir1');
  await expect(page.getByText('Inventory terkait')).toBeVisible();
  for (const label of ['Tandai sedang diperiksa', 'Setujui', 'Tandai selesai']) {
    await page.getByRole('button', { name: label }).click();
    await dialog(page).getByRole('button', { name: label }).click();
    await expect(dialog(page)).toBeHidden();
  }
  await expect(page.getByText('Selesai', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Setujui|Tolak|Tandai/ })).toHaveCount(0);
  expect(api.writes.map((w) => w.body.status)).toEqual(['IN_REVIEW', 'APPROVED', 'RESOLVED']);
});

test('inventory report: "Tolak" needs a reason', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/reports/inventory/ir2');
  await page.getByRole('button', { name: 'Tolak' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Tolak' })).toBeDisabled();
  await dialog(page).getByLabel('Alasan').fill('Stok masih cukup.');
  await dialog(page).getByRole('button', { name: 'Tolak' }).click();
  await expect(dialog(page)).toBeHidden();
  expect(api.writes[0].body).toEqual({ status: 'REJECTED', review_reason: 'Stok masih cukup.' });
});

test('add an inventory item (multipart), edit it from the detail page', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/inventories');
  await page.getByRole('button', { name: 'Tambah inventory' }).click();
  await dialog(page)
    .getByRole('combobox', { name: /vendor/i })
    .click();
  await page.getByRole('option', { name: /Karya Aman/ }).click();
  await dialog(page).getByLabel('Nama item').fill('Tangga lipat');
  await dialog(page).getByLabel('Jenis item').fill('Alat kerja');
  await dialog(page).getByLabel('Jumlah', { exact: true }).fill('3');
  await dialog(page).getByLabel('Kondisi', { exact: true }).selectOption('GOOD');
  await dialog(page).getByRole('button', { name: 'Simpan inventory' }).click();
  await expect(page.getByText('Inventory berhasil disimpan.')).toBeVisible();
  expect(api.writes[0]).toMatchObject({
    method: 'POST',
    path: '/inventories',
    body: {
      vendor_id: 'v2',
      item: 'Tangga lipat',
      jenis_item: 'Alat kerja',
      qty: '3',
      status_condition: 'GOOD',
    },
  });

  await page.goto('/inventories/n1');
  await page.getByRole('button', { name: 'Edit' }).click();
  await dialog(page).getByLabel('Nama item').fill('APAR 9 kg');
  await dialog(page).getByRole('button', { name: 'Simpan inventory' }).click();
  await expect(page.getByRole('heading', { name: 'APAR 9 kg', level: 1 })).toBeAttached();
  // A reopened form shows the saved values, not leftover input.
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(dialog(page).getByLabel('Nama item')).toHaveValue('APAR 9 kg');
});

test('SOP "Buka" opens the signed URL in a new tab without an opener', async ({
  page,
  context,
}) => {
  await mockApi(page);
  await context.route('http://localhost/e2e-files/**', (route) =>
    route.fulfill({ contentType: 'text/plain', body: 'pdf' }),
  );
  await page.goto('/policies');
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Buka SOP Kerja di Ketinggian' }).click(),
  ]);
  await expect.poll(() => tab.url()).toContain('/e2e-files/q1.pdf');
  expect(await tab.evaluate(() => window.opener)).toBeNull();
});

test('pipeline detail: add a task at the end and move a task up', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/pipelines/p1');
  await expect(page.getByText('Sapu dan pel lantai')).toBeVisible();
  await page.getByRole('button', { name: 'Naikkan Lap panel' }).click();
  await expect
    .poll(() => api.writes.filter((w) => w.path.startsWith('/pipeline-items/')).length)
    .toBe(2);
  await page.getByRole('combobox', { name: 'Tambah task ke pipeline' }).click();
  await page.getByRole('option', { name: /Lap panel/ }).click();
  await expect
    .poll(() => api.writes.at(-1))
    .toMatchObject({
      method: 'POST',
      path: '/pipelines/p1/items',
      body: { item_id: 'i2', sort_order: 3 },
    });
});

test('audit log shows user names, searches and sorts', async ({ page }) => {
  await mockApi(page);
  await page.goto('/audit-logs');
  const users = page.locator('tbody tr td:nth-child(2)');
  await expect(users.first()).toContainText('Agus Pratama');
  await page.getByRole('columnheader', { name: 'User' }).getByRole('button').click();
  await page.getByRole('columnheader', { name: 'User' }).getByRole('button').click();
  await expect(users.first()).toContainText('Hendra Wijaya');
  await page.getByRole('searchbox').fill('10.0.0.5');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: /^14 Okt 2026/ }).click();
  await expect(dialog(page).getByText('Agus Pratama')).toBeVisible();
});

test('"Buat pipeline": choose the vendor first, then one of its sites', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/pipelines');
  await page.getByRole('button', { name: 'Buat pipeline' }).click();
  const form = dialog(page);
  const siteSelect = form.getByRole('combobox', { name: 'Site' });
  await expect(siteSelect).toBeDisabled();
  await expect(siteSelect).toHaveValue('');

  await form.getByLabel('Nama pipeline').fill('Cleaning Area Baru');
  await form.getByRole('button', { name: 'Simpan pipeline' }).click();
  await expect(form.getByText('Vendor wajib dipilih.')).toBeVisible();

  await form.getByRole('combobox', { name: 'Vendor' }).click();
  await page.getByRole('option', { name: /Bersih Jaya/ }).click();
  // PT Bersih Jaya works at one site only: it is filled in.
  await expect(siteSelect).toBeEnabled();
  await expect(siteSelect.locator('option:checked')).toHaveText('PLTU Paiton');
  await expect(siteSelect.locator('option')).toHaveText(['Pilih site', 'PLTU Paiton']);
  await form.getByRole('button', { name: 'Simpan pipeline' }).click();
  await expect(page.getByText('Pipeline berhasil disimpan.')).toBeVisible();

  expect(api.writes.find((w) => w.path === '/pipelines')?.body).toMatchObject({
    site_id: 's1',
    vendor_id: 'v1',
    name: 'Cleaning Area Baru',
  });
});

test('users: the role and status filters work even if the API ignores them', async ({ page }) => {
  await mockApi(page);
  await page.goto('/users');
  const table = page.getByRole('table');
  await expect(table.getByText('@agus')).toBeVisible();

  await page.getByRole('combobox', { name: 'Filter role' }).selectOption('WORKER');
  await expect(page).toHaveURL(/role=WORKER/);
  await expect(table.getByText('@agus')).toBeVisible();
  await expect(table.getByText('@siti')).toHaveCount(0);
  await expect(table.getByText('@superadmin')).toHaveCount(0);

  await page.getByRole('combobox', { name: 'Filter role' }).selectOption('');
  await page.getByRole('combobox', { name: 'Filter status' }).selectOption('INACTIVE');
  await expect(table.getByText('@siti')).toBeVisible();
  await expect(table.getByText('@agus')).toHaveCount(0);
});

test('users: changing the scope saves roles and scopes, and the table shows the new scope', async ({
  page,
}) => {
  const api = await mockApi(page);
  await page.goto('/users/u2');
  await page.getByRole('combobox', { name: 'Site' }).click();
  await page.getByRole('option', { name: /PLTGU Grati/ }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Simpan role & scope' }).click();
  await expect(page.getByText('Role dan scope berhasil disimpan.')).toBeVisible();

  expect(api.writes.map((w) => [w.method, w.path, w.body])).toEqual([
    ['PUT', '/users/u2/scopes', { roles: ['ADMIN'], site_ids: ['s1', 's2'], vendor_ids: [] }],
  ]);

  await page.goto('/users');
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: '@siti' })
      .getByText(/PLTU Paiton, PLTGU Grati/),
  ).toBeVisible();
});

test('users: Admin → Worker changes role and scope together in one call', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/users/u2');
  await page.locator('#role-ADMIN').click();
  await page.locator('#role-WORKER').click();
  await page.getByRole('combobox', { name: 'Vendor' }).click();
  await page.getByRole('option', { name: /Bersih Jaya/ }).click();
  await page.getByRole('button', { name: 'Simpan role & scope' }).click();
  await expect(page.getByText('Role dan scope berhasil disimpan.')).toBeVisible();
  expect(api.writes.map((w) => [w.path, w.body])).toEqual([
    ['/users/u2/scopes', { roles: ['WORKER'], site_ids: [], vendor_ids: ['v1'] }],
  ]);
});

test('vendor progress: today by default, period sums the days, row opens the detail', async ({
  page,
}) => {
  await mockApi(page);
  /** @type {string[]} */
  const dates = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/v1/dashboard/summary')
      dates.push(url.searchParams.get('date') ?? '');
  });
  // "Rekap lengkap" on the dashboard opens this page.
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Rekap lengkap' }).click();
  await expect(page).toHaveURL(/\/vendor-progress$/);
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(3);
  await expect(table.getByRole('row').nth(1)).toContainText('PT Bersih Jaya');
  await expect(table.getByRole('row').nth(1)).toContainText('PLTU Paiton');
  await expect(table.getByRole('row').nth(1)).toContainText('75%');
  expect(new Set(dates).size).toBe(1);

  // Search, then sort by progress (highest first after two clicks).
  await page.getByRole('searchbox').fill('karya');
  await expect(table.getByRole('row')).toHaveCount(2);
  await page.getByRole('searchbox').fill('');
  await expect(table.getByRole('row')).toHaveCount(3);

  // Three days: one request per day, counts added up.
  dates.length = 0;
  const today = await page.getByLabel('Sampai').inputValue();
  const [y, m, d] = today.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, d - 2)).toISOString().slice(0, 10);
  await page.getByLabel('Dari').fill(from);
  await expect(table.getByRole('row').nth(1)).toContainText('60');
  expect(new Set(dates).size).toBe(3);

  await table.getByRole('row').filter({ hasText: 'PT Bersih Jaya' }).click();
  await expect(page).toHaveURL((url) => url.href.endsWith(`/vendor-progress/v1?from=${from}`));
  await expect(page.getByRole('heading', { name: 'PT Bersih Jaya', level: 1 })).toBeVisible();
  await expect(page.getByText('Total worker')).toBeVisible();
  await expect(page.getByText('Temuan safety', { exact: true })).toBeVisible();
  const turbine = page.locator('details').filter({ hasText: 'Turbine Hall' });
  await expect(turbine).toContainText('83%');
  await expect(turbine).toContainText('Shift Pagi');
  await expect(turbine).toContainText('temuan safety');
  await turbine.locator('summary').click();
  const points = turbine.getByRole('table', { name: 'Titik di area Turbine Hall' });
  await expect(points.getByRole('row').filter({ hasText: 'Lantai Turbin' })).toContainText(
    'Agus Pratama',
  );
  await expect(points.getByRole('row').filter({ hasText: 'Lantai Turbin' })).toContainText(
    'Unsafe condition',
  );
  await expect(points.getByRole('row').filter({ hasText: 'Sinta Maharani' })).toContainText(
    'Belum dikerjakan',
  );
  // Search narrows the areas down to the matching points.
  await page.getByPlaceholder('Cari area, titik, atau worker').fill('sinta');
  await expect(page.locator('details')).toHaveCount(1);
  await page.getByPlaceholder('Cari area, titik, atau worker').fill('');
  await page.getByRole('link', { name: 'Kembali ke progress vendor' }).click();
  await expect(page).toHaveURL((url) => url.href.endsWith(`/vendor-progress?from=${from}`));
});
