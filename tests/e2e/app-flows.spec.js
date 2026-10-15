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
