import { expect, test } from '@playwright/test';
import { mockAuthApi } from './support/mock-api.js';

test('login → mandatory password change → back to login → login with the new password', async ({
  page,
  context,
}) => {
  await mockAuthApi(page);

  await page.goto('/login');
  await expect(page).toHaveTitle('Masuk · SafeOps 360');
  await page.getByLabel('Username').fill('Agus.Pratama');
  await page.getByLabel('Password', { exact: true }).fill('Kp7mw2Rq');
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page).toHaveURL(/\/change-password$/);
  await expect(page).toHaveTitle('Buat Password Baru · SafeOps 360');
  await expect(page.getByRole('heading', { name: 'Buat password baru' })).toBeVisible();
  await expect(page.getByText('agus.pratama', { exact: true })).toBeVisible();

  // The refresh token is an HttpOnly cookie; nothing token-like is readable from JS.
  const cookies = await context.cookies();
  const refreshCookie = cookies.find((cookie) => cookie.name === 'refresh_token');
  expect(refreshCookie?.httpOnly).toBe(true);
  const jsVisible = await page.evaluate(() => ({
    cookie: document.cookie,
    local: JSON.stringify({ ...window.localStorage }),
    session: JSON.stringify({ ...window.sessionStorage }),
  }));
  expect(jsVisible.cookie).not.toContain('e2e-');
  expect(jsVisible.local).not.toContain('e2e-');
  expect(jsVisible.session).not.toContain('e2e-');

  const submit = page.getByRole('button', { name: 'Simpan dan lanjutkan' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('Password sementara').fill('Kp7mw2Rq');
  await page.getByLabel('Password baru', { exact: true }).fill('rahasiabaru1');
  await page.getByLabel('Ulangi password baru').fill('rahasiabaru1');
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByText('Password berhasil diganti. Silakan masuk dengan password baru.'),
  ).toBeVisible();

  await page.getByLabel('Username').fill('agus.pratama');
  await page.getByLabel('Password', { exact: true }).fill('Kp7mw2Rq');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.locator('#login-error')).toHaveText('Username atau password salah.');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();

  await page.getByLabel('Password', { exact: true }).fill('rahasiabaru1');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Beranda — segera hadir' })).toBeVisible();
});

test('a protected page restores the session from the refresh cookie after reload', async ({
  page,
}) => {
  const api = await mockAuthApi(page, { sessionFor: 'budi.santoso' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Beranda — segera hadir' })).toBeVisible();
  expect(api.refreshCalls).toBe(1);

  await page.getByRole('button', { name: 'Keluar' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(api.session).toBeNull();
});

test('without a session, protected pages redirect to login with a safe next', async ({ page }) => {
  await mockAuthApi(page);
  await page.goto('/change-password');
  await expect(page).toHaveURL(/\/login\?next=%2Fchange-password$/);
});

test('open redirects are ignored', async ({ page }) => {
  await mockAuthApi(page);
  await page.goto('/login?next=//evil.com');
  await page.getByLabel('Username').fill('budi.santoso');
  await page.getByLabel('Password', { exact: true }).fill('rahasia123');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
});

test('security headers are present', async ({ page }) => {
  await mockAuthApi(page);
  const response = await page.goto('/login');
  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+'/);
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBe('camera=(self), geolocation=(self), microphone=()');
});
