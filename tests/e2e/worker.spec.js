import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockWorkerApi, PHOTO } from './support/mock-worker-api.js';

/*
 * Worker (prompt section 8): tasks of the day, the task report (photos, notes, send, revision,
 * offline queue), inventory reports, history, and isolation. Main viewport 360×800.
 */

test.use({ viewport: { width: 360, height: 800 } });

/** @param {import('@playwright/test').Page} page @param {string} name */
const taskRow = (page, name) => page.getByRole('listitem').filter({ hasText: name });

test('lands on "Tugas hari ini" with the day progress and the vendor/shift context', async ({
  page,
}) => {
  await mockWorkerApi(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByText('1 dari 5 task selesai')).toBeVisible();
  await expect(page.getByText('1 menunggu review')).toBeVisible();
  await expect(page.getByText('Shift Pagi · PT Bersih Jaya').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cleaning Turbine Hall Lt.1' })).toBeVisible();
  await expect(taskRow(page, 'Kosongkan kantong sampah')).toContainText(
    'Alasan: Foto sesudah buram',
  );

  const nav = page.getByRole('navigation', { name: 'Navigasi bawah' });
  for (const label of ['Tugas', 'Riwayat', 'Lapor', 'SOP', 'Profil']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  }
});

test('start → photo before → photo after → notes → save → send', async ({ page }) => {
  const api = await mockWorkerApi(page);
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Mulai Periksa jalur evakuasi' }).click();
  await expect(page).toHaveURL(/\/tasks\/report\/r-new-1$/);
  await expect(page.getByRole('navigation', { name: 'Navigasi bawah' })).toBeHidden();

  // The "after" photo can only be taken once there is a "before" photo.
  await expect(page.getByLabel('Ambil foto sesudah')).toBeDisabled();
  await expect(page.getByText('Lengkapi foto sebelum untuk mengirim laporan.')).toBeVisible();
  await page.getByLabel('Ambil foto sebelum').setInputFiles(PHOTO);
  await expect(page.getByLabel('Ganti foto sebelum')).toBeEnabled();
  await page.getByLabel('Ambil foto sesudah').setInputFiles(PHOTO);
  await expect(page.getByLabel('Ganti foto sesudah')).toBeEnabled();

  await page.getByLabel('Unsafe condition').check();
  await page.getByLabel('Catatan', { exact: true }).fill('Lampu darurat jalur evakuasi mati.');
  await page.getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByText('Catatan disimpan.')).toBeVisible();

  await page.getByRole('button', { name: 'Kirim laporan' }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByText('Laporan terkirim.')).toBeVisible();
  await expect(taskRow(page, 'Periksa jalur evakuasi')).toContainText('Selesai');

  // Postman: PATCH multipart evidence_before / evidence_after with open_date / closed_date;
  // compressed to JPEG and named after the type.
  const uploads = api.writes.filter((w) => w.body.evidence_before || w.body.evidence_after);
  expect(uploads.map((w) => [w.path, w.body.evidence_before ?? w.body.evidence_after])).toEqual([
    ['/pipeline-reports/r-new-1', { file: 'before.jpg' }],
    ['/pipeline-reports/r-new-1', { file: 'after.jpg' }],
  ]);
  expect(uploads[0].body.open_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(uploads[1].body.closed_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(api.writes.find((w) => w.method === 'PATCH' && 'notes' in w.body)?.body).toEqual({
    notes: 'Lampu darurat jalur evakuasi mati.',
    note_category: 'UNSAFE_CONDITION',
  });
  // Postman: "Kirim" = PATCH status COMPLETED with the close time.
  expect(api.writes.at(-1)).toMatchObject({
    method: 'PATCH',
    path: '/pipeline-reports/r-new-1',
    body: { status: 'COMPLETED' },
  });
  expect(api.writes.at(-1)?.body.closed_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('"Mulai" on a task that already has a report (409) opens that report', async ({ page }) => {
  const api = await mockWorkerApi(page);
  await page.goto('/tasks');
  await expect(page.getByRole('button', { name: 'Mulai Periksa jalur evakuasi' })).toBeVisible();
  // Started meanwhile on another device.
  api.data.reports.push({ ...api.data.reports[2], id: 'r5', pipeline_item_id: 'pi5' });
  await page.getByRole('button', { name: 'Mulai Periksa jalur evakuasi' }).click();
  await expect(page).toHaveURL(/\/tasks\/report\/r5$/);
});

test('revision: the reason is shown, the after photo is replaced and the report re-sent', async ({
  page,
}) => {
  const api = await mockWorkerApi(page);
  await page.goto('/tasks');
  await page.getByRole('link', { name: 'Perbaiki Kosongkan kantong sampah' }).click();
  await expect(
    page.getByText('Revisi diminta: Foto sesudah buram, ulangi dari sudut yang sama.'),
  ).toBeVisible();
  await page.getByLabel('Ganti foto sesudah').setInputFiles(PHOTO);
  await expect(page.getByText('Mengunggah…')).toBeHidden();
  await page.getByRole('button', { name: 'Kirim laporan' }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  expect(api.writes.map((w) => w.path)).toEqual(['/pipeline-reports/r4', '/pipeline-reports/r4']);
});

test('a photo taken offline waits on the device and is sent when back online', async ({ page }) => {
  const api = await mockWorkerApi(page);
  await page.goto('/tasks/report/r3');
  await expect(page.getByText('Lengkapi foto sesudah untuk mengirim laporan.')).toBeVisible();
  await page.waitForLoadState('networkidle');

  await api.setOffline(true);
  await page.getByLabel('Ambil foto sesudah').setInputFiles(PHOTO);
  await expect(page.getByText('Menunggu sinyal', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Foto disimpan di perangkat dan akan dikirim saat online.'),
  ).toBeVisible();
  await expect(page.getByText('Foto sesudah masih menunggu sinyal.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kirim laporan' })).toBeDisabled();

  await api.setOffline(false);
  await expect(page.getByText('Menunggu sinyal', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Kirim laporan' })).toBeEnabled();
  expect(
    api.writes.filter((w) => w.path === '/pipeline-reports/r3' && w.body.evidence_after),
  ).toHaveLength(1);
});

test('read-only once submitted; another worker’s report is not found', async ({ page }) => {
  await mockWorkerApi(page);
  await page.goto('/tasks/report/r2');
  await expect(page.getByText('Menunggu review admin vendor.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kirim laporan' })).toHaveCount(0);
  await expect(page.getByLabel('Catatan', { exact: true })).toBeDisabled();

  await page.goto('/tasks/report/r9');
  await expect(page.getByText('Data tidak ditemukan')).toBeVisible();
});

test('admin pages are forbidden for a worker', async ({ page }) => {
  await mockWorkerApi(page);
  for (const path of ['/dashboard', '/users', '/reports/tasks', '/inventories']) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'Anda tidak memiliki akses ke halaman ini.' }),
    ).toBeVisible();
  }
});

test('inventory damage report shows up in "Laporan saya"', async ({ page }) => {
  const api = await mockWorkerApi(page);
  await page.goto('/inventory-reports/new');
  await expect(page.getByRole('navigation', { name: 'Navigasi bawah' })).toBeHidden();
  // The rejected report shows its reason.
  await expect(page.getByText('Ditolak: Stok sudah dikirim kemarin.')).toBeVisible();

  await page.getByLabel('Kerusakan').check();
  await page.getByLabel('Keterangan').fill('Gagang sapu patah.');
  await page.getByRole('button', { name: 'Kirim laporan' }).click();
  await expect(page.getByText('Pilih inventory yang rusak.')).toBeVisible();

  await page
    .getByLabel('Inventory', { exact: true })
    .selectOption({ label: 'Sapu ijuk · Alat kebersihan' });
  await page.getByRole('button', { name: 'Kirim laporan' }).click();
  await expect(page.getByText('Laporan inventory terkirim.')).toBeVisible();

  const panel = page.getByRole('region', { name: 'Laporan saya' });
  await expect(panel.getByRole('article').first()).toContainText('Kerusakan');
  await expect(panel.getByRole('article').first()).toContainText('Baru');
  await expect(panel.getByRole('article').first()).toContainText('Sapu ijuk');
  expect(api.writes.at(-1)?.body).toMatchObject({
    vendor_id: 'v1',
    report_type: 'DAMAGED',
    inventory_id: 'inv1',
    description: 'Gagang sapu patah.',
  });
});

test('history: "Revisi diminta" shows the one report waiting for a fix', async ({ page }) => {
  await mockWorkerApi(page);
  await page.goto('/history');
  await expect(page.getByRole('link', { name: /Sapu & pel lantai/ })).toBeVisible();
  await page.getByRole('button', { name: 'Revisi diminta' }).click();
  await expect(page.getByRole('link', { name: /Kosongkan kantong sampah/ })).toBeVisible();
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
});

test('SOP is a read-only card list with "Buka"', async ({ page }) => {
  await mockWorkerApi(page);
  await page.goto('/policies');
  await expect(page.getByText('SOP Kebersihan Turbine Hall')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Buka SOP Kebersihan Turbine Hall' }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Upload|Tambah/ })).toHaveCount(0);
});

const PAGES = ['/tasks', '/tasks/report/r3', '/inventory-reports/new', '/history'];
const FORM_PAGES = ['/tasks/report/r3', '/inventory-reports/new'];

for (const width of [360, 640, 768, 1024, 1280, 1536]) {
  test(`worker pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockWorkerApi(page);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('main')).not.toBeEmpty();
      await page.waitForLoadState('networkidle');
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, path).toBeLessThanOrEqual(innerWidth);
      if (width < 768 && FORM_PAGES.includes(path)) {
        await expect(page.getByRole('navigation', { name: 'Navigasi bawah' })).toBeHidden();
      }
    }
  });
}

for (const width of [360, 1280]) {
  test(`worker pages have no serious accessibility violations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockWorkerApi(page);
    for (const path of [...PAGES, '/policies', '/profile']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${path} ${v.id}: ${v.help}`);
      expect(serious).toEqual([]);
    }
  });
}
