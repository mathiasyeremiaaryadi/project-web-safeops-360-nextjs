import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './support/mock-api.js';
import { mockSla } from './support/mock-sla.js';
import { mockWorkerApi } from './support/mock-worker-api.js';
import {
  ADMIN_PAITON,
  ADMIN_VENDOR_TWO_SITES,
  SUPER_ADMIN,
  VENDOR_SCOPES,
} from './support/fixtures.js';

/*
 * SLA & maturity (SLA prompt section 7): rules (create, edit = new version, deactivate),
 * dashboard states (OK / NO_DATA / NO_RULE / live), history, detail, and the Worker card.
 */

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

/** @param {import('@playwright/test').Page} page */
const asSuperAdmin = async (page) => {
  await mockApi(page, { user: SUPER_ADMIN });
  return mockSla(page, { role: 'SUPER_ADMIN' });
};

/** @param {import('@playwright/test').Page} page */
const asAdmin = async (page) => {
  await mockApi(page, { user: ADMIN_PAITON });
  return mockSla(page, { role: 'ADMIN', siteIds: ['s1'] });
};

/** @param {import('@playwright/test').Page} page */
const dialog = (page) => page.getByRole('dialog');

/** @param {import('@playwright/test').Page} page @param {string} name */
const row = (page, name) => page.getByRole('row').filter({ hasText: name });

/**
 * Fills the weights (and targets) of the given indicators, unchecking the others.
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, [string, string?]>} used label → [weight, target]
 */
async function fillIndicators(page, used) {
  for (const [label, [weight, target]] of Object.entries(used)) {
    const checkbox = page.getByRole('checkbox', { name: new RegExp(`^${label}`) });
    if (!(await checkbox.isChecked())) await checkbox.check();
    const id = await checkbox.getAttribute('id');
    await page.locator(`#${id}-weight`).fill(weight);
    if (target !== undefined) await page.locator(`#${id}-target`).fill(target);
  }
}

test('Super Admin: rule for PT Cahaya Facility from the dashboard call to action', async ({
  page,
}) => {
  const sla = await asSuperAdmin(page);
  await page.goto('/sla');
  await expect(page.getByText('Sementara').first()).toBeVisible();
  const cahaya = row(page, 'PT Cahaya Facility');
  await expect(cahaya).toContainText('Belum ada aturan SLA');
  await cahaya.getByRole('link', { name: 'Buat aturan SLA →' }).click();
  await expect(page).toHaveURL(/\/sla\/rules\/new\?type=sla&vendor_id=v6/);

  await fillIndicators(page, {
    'Tingkat penyelesaian': ['60', '95'],
    'Ketepatan waktu': ['40', '90'],
  });
  await expect(page.getByText('Total bobot 100 / 100 · 2 indikator dipakai')).toBeVisible();
  await page.getByRole('button', { name: 'Simpan aturan' }).click();
  await expect(page.getByText('Aturan SLA v1 disimpan')).toBeVisible();
  await expect(page).toHaveURL(/\/sla\/rules\?type=sla/);
  expect(sla.writes.at(-1)?.body).toEqual({
    vendor_id: 'v6',
    site_id: null,
    period_type: 'MONTH',
    indicators: [
      { code: 'COMPLETION_RATE', weight: 60, target: 95 },
      { code: 'ON_TIME_RATE', weight: 40, target: 90 },
    ],
  });
  await expect(row(page, 'PT Cahaya Facility')).toBeVisible();

  await page.goto('/sla');
  await expect(row(page, 'PT Cahaya Facility')).not.toContainText('Belum ada aturan SLA');
});

test('Super Admin: edit Bersih Jaya v3 → v4, history shows v4 active with the changes', async ({
  page,
}) => {
  const sla = await asSuperAdmin(page);
  await page.goto('/sla/rules');
  await row(page, 'PT Bersih Jaya')
    .filter({ hasText: 'Default vendor' })
    .getByRole('link', { name: 'Edit' })
    .click();
  await expect(
    page.getByText('Menyimpan form ini membuat versi baru (v4) yang menggantikan v3.'),
  ).toBeVisible();
  const save = page.getByRole('button', { name: 'Simpan sebagai v4' });

  await fillIndicators(page, { 'Ketepatan waktu': ['25'] });
  await expect(page.getByRole('alert').filter({ hasText: 'Kurang 5' })).toBeVisible();
  await expect(save).toBeDisabled();
  await fillIndicators(page, { 'Ketepatan waktu': ['25'], 'Tingkat penyelesaian': ['35'] });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText('Aturan SLA v4 disimpan')).toBeVisible();
  expect(sla.writes.at(-1)?.method).toBe('POST');

  await row(page, 'PT Bersih Jaya')
    .filter({ hasText: 'Default vendor' })
    .getByRole('link', { name: 'Riwayat' })
    .click();
  const versions = page.getByRole('list', { name: 'Daftar versi' }).getByRole('listitem');
  await expect(versions).toHaveCount(4);
  await expect(versions.first()).toContainText('v4');
  await expect(versions.first()).toContainText('Aktif');
  await expect(versions.first()).toContainText(
    'Bobot tingkat penyelesaian 30 → 35; Bobot ketepatan waktu 30 → 25',
  );
  await expect(versions.last()).toContainText('Aturan awal');
});

test('Super Admin: deactivate the PLTU Pacitan override', async ({ page }) => {
  await asSuperAdmin(page);
  await page.goto('/sla/rules');
  const pacitan = row(page, 'PLTU Pacitan');
  await pacitan.getByRole('button', { name: 'Nonaktifkan' }).click();
  await expect(dialog(page)).toContainText('Nonaktifkan aturan khusus PLTU Pacitan?');
  await expect(dialog(page)).toContainText('aturan default vendor v3 (Bulanan)');
  await dialog(page).getByRole('button', { name: 'Nonaktifkan' }).click();
  await expect(page.getByText('Aturan SLA dinonaktifkan.')).toBeVisible();
  await expect(row(page, 'PLTU Pacitan')).toHaveCount(0);
});

test('Admin: maturity override for PLTU Paiton; default vendor rows are read-only', async ({
  page,
}) => {
  const sla = await asAdmin(page);
  await page.goto('/sla/rules?type=maturity');
  const defaultRow = row(page, 'PT Bersih Jaya').filter({ hasText: 'Default vendor' });
  await expect(defaultRow.getByRole('link', { name: 'Lihat' })).toBeVisible();
  await expect(defaultRow.getByRole('link', { name: 'Riwayat' })).toBeVisible();
  await expect(defaultRow.getByRole('link', { name: 'Edit' })).toHaveCount(0);
  await expect(defaultRow.getByRole('button', { name: 'Nonaktifkan' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Buat aturan maturity' }).click();
  await expect(page.getByRole('radio', { name: /Default vendor/ })).toBeDisabled();
  await expect(
    page.getByText('Hanya Super Admin yang bisa membuat aturan default vendor.'),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Vendor' }).click();
  await page.getByRole('option', { name: /Bersih Jaya/ }).click();
  await page.getByRole('combobox', { name: 'Site' }).selectOption('s1');
  await fillIndicators(page, { 'Ketepatan waktu': ['50'], Konsistensi: ['50'] });

  await page.getByLabel('Skor minimum Level 4').fill('70');
  await page.getByRole('button', { name: 'Simpan aturan' }).click();
  await expect(page.getByText('Harus sama atau lebih tinggi dari Level 3.')).toBeVisible();
  await page.getByRole('button', { name: 'Kembalikan default' }).click();
  await page.getByRole('button', { name: 'Simpan aturan' }).click();
  await expect(page.getByText('Aturan maturity v1 disimpan')).toBeVisible();
  expect(sla.writes.at(-1)?.body).toEqual({
    vendor_id: 'v1',
    site_id: 's1',
    period_type: 'MONTH',
    dimensions: [
      { code: 'ON_TIME_RATE', weight: 50 },
      { code: 'CONSISTENCY', weight: 50 },
    ],
  });
});

test('Admin: vendors at the site with NO_RULE / NO_DATA, then the detail with N/A', async ({
  page,
}) => {
  await asAdmin(page);
  await page.goto('/sla');
  await expect(
    page.getByRole('group', { name: 'Tingkat' }).getByRole('button', { name: 'Vendor di site' }),
  ).toHaveAttribute('aria-pressed', 'true');
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(6);
  await expect(row(page, 'PT Cahaya Facility')).toContainText('Belum ada aturan SLA');
  await expect(
    row(page, 'PT Cahaya Facility').getByRole('link', { name: 'Buat aturan SLA →' }),
  ).toBeVisible();
  const mitra = row(page, 'CV Mitra Higienis');
  await expect(mitra).toContainText('Tidak ada data');
  // NO_DATA never shows a zero score or a bar.
  await expect(mitra.getByRole('progressbar')).toHaveCount(0);
  await expect(mitra).not.toContainText(/\b0\b/);
  await expect(row(page, 'PT Karya Aman')).toContainText('Turun dari Level 3');

  await row(page, 'PT Bersih Jaya').getByRole('link', { name: 'Rincian' }).click();
  await expect(page.getByRole('heading', { name: 'Rincian Oktober 2026', level: 1 })).toBeVisible();
  const k3 = page.getByRole('row').filter({ hasText: 'Temuan K3 berpenjelasan' });
  await expect(k3).toContainText('N/A');
  await expect(page.getByText('Total skor 98,1 / 100')).toBeVisible();
});

test('Admin vendor: only their vendor, history chart of 6 periods, no rules page', async ({
  page,
}) => {
  await mockApi(page, { user: ADMIN_VENDOR_TWO_SITES, vendorScope: VENDOR_SCOPES.v1 });
  await mockSla(page, { role: 'ADMIN_WORKER', vendorId: 'v1' });
  await page.goto('/sla');
  await expect(page.getByRole('group', { name: 'Tingkat' }).getByRole('button')).toHaveText([
    'Vendor di site',
    'Vendor',
    'Worker',
  ]);
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('PT Bersih Jaya');
  // No CTA for a role that cannot create rules.
  await expect(page.getByRole('link', { name: /Buat aturan/ })).toHaveCount(0);

  await table.getByRole('link', { name: 'Riwayat' }).click();
  await expect(page.getByRole('img', { name: /Skor SLA 6 periode terakhir/ })).toBeVisible();
  await expect(
    page.getByText('Naik ke Level 4 pada September 2026 (sebelumnya Level 3).'),
  ).toBeVisible();
  const list = page.getByRole('region', { name: 'Ringkasan per periode' }).getByRole('listitem');
  await expect(list).toHaveCount(6);
  await expect(list.first()).toContainText('Sementara');

  // "Rincian" of a closed period: the API sends timestamps, the request must use a date.
  await list.filter({ hasText: 'September 2026' }).getByRole('link', { name: 'Rincian' }).click();
  await expect(
    page.getByRole('heading', { name: 'Rincian September 2026', level: 1 }),
  ).toBeVisible();
  await expect(page.getByText('Final', { exact: true })).toBeVisible();
  await expect(page.getByText('Total skor 95,6 / 100')).toBeVisible();

  await page.goto('/sla/rules');
  await expect(
    page.getByRole('heading', { name: 'Anda tidak memiliki akses ke halaman ini.' }),
  ).toBeVisible();
});

test('Worker: "Skor SLA saya" on /tasks; hidden when the API answers 403', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockWorkerApi(page);
  await page.goto('/tasks');
  const card = page.getByRole('region', { name: 'Skor SLA saya' });
  await expect(card).toContainText('96,4');
  await expect(card).toContainText('4 dari 5 indikator tercapai');
  await expect(card).toContainText('Ketepatan waktu 86% (target ≥ 90%)');
  await expect(card).toContainText('Sementara');
});

test('Worker: SLA card hidden on 403, tasks still work', async ({ page }) => {
  await mockWorkerApi(page, { slaForbidden: true });
  await page.goto('/tasks');
  await expect(page.getByText('1 dari 5 task selesai')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Skor SLA saya' })).toHaveCount(0);
});

test('Pipeline: the form refuses to save without a site', async ({ page }) => {
  await mockApi(page, { user: SUPER_ADMIN });
  await page.goto('/pipelines');
  await page.getByRole('button', { name: 'Buat pipeline' }).click();
  await dialog(page).getByRole('combobox', { name: 'Vendor' }).click();
  await page.getByRole('option', { name: /Bersih Jaya/ }).click();
  await dialog(page).getByRole('combobox', { name: 'Site' }).selectOption('');
  await dialog(page).getByLabel('Nama pipeline').fill('Tanpa site');
  await dialog(page).getByRole('button', { name: 'Simpan pipeline' }).click();
  await expect(dialog(page).getByText('Site wajib dipilih.')).toBeVisible();
});

const PAGES = [
  '/sla',
  '/sla/history?scope=SITE&vendor_id=v1&site_id=s1',
  '/sla/detail?scope=SITE&vendor_id=v1&site_id=s1&period_start=2026-09-01',
  '/sla/rules',
  '/sla/rules/new?type=maturity',
];

for (const width of [360, 640, 768, 1024, 1280, 1536]) {
  test(`SLA pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await asSuperAdmin(page);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('main')).not.toBeEmpty();
      await page.waitForLoadState('networkidle');
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, path).toBeLessThanOrEqual(innerWidth);
    }
    if (width < 768) {
      await page.goto('/sla/rules/new');
      await expect(page.getByRole('button', { name: 'Simpan aturan' })).toBeVisible();
    }
  });
}

for (const width of [360, 1280]) {
  test(`SLA pages have no serious accessibility violations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await asSuperAdmin(page);
    for (const path of PAGES) {
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
