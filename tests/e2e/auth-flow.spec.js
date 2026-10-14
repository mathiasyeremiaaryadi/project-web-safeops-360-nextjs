import { expect, test } from '@playwright/test';
import { getMockStats, loginViaForm, resetMockUser } from './support/mock-go.js';

const SESSION_COOKIE = '__Host-safeops_session';

test('login → mandatory password change → back to login → login with the new password', async ({
  page,
  context,
  request,
}) => {
  await resetMockUser(request, 'agus.pratama');

  await page.goto('/login');
  await expect(page).toHaveTitle('Masuk · SafeOps 360');
  await loginViaForm(page, 'Agus.Pratama', 'Kp7mw2Rq');

  await expect(page).toHaveURL(/\/change-password$/);
  await expect(page).toHaveTitle('Buat Password Baru · SafeOps 360');
  await expect(page.getByRole('heading', { name: 'Buat password baru' })).toBeVisible();
  await expect(page.getByText('agus.pratama', { exact: true })).toBeVisible();

  // BFF: the browser holds ONE encrypted HttpOnly cookie and no Go token anywhere.
  const cookies = await context.cookies();
  expect(cookies.map((cookie) => cookie.name)).toEqual([SESSION_COOKIE]);
  expect(cookies[0]).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
  expect(cookies[0].value).not.toMatch(/go-(access|refresh)/);
  const jsVisible = await page.evaluate(() =>
    JSON.stringify({
      cookie: document.cookie,
      local: { ...window.localStorage },
      session: { ...window.sessionStorage },
    }),
  );
  expect(jsVisible).not.toMatch(/go-(access|refresh)|safeops_session/);

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
  expect(await context.cookies()).toHaveLength(0);

  await loginViaForm(page, 'agus.pratama', 'Kp7mw2Rq');
  await expect(page.locator('#login-error')).toHaveText('Username atau password salah.');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();

  await page.getByLabel('Password', { exact: true }).fill('rahasiabaru1');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Beranda — segera hadir' })).toBeVisible();

  await resetMockUser(request, 'agus.pratama');
});

test('the session survives a reload, and logout ends it', async ({ page, context }) => {
  await page.goto('/login');
  await loginViaForm(page, 'budi.santoso', 'rahasia123');
  await expect(page.getByRole('heading', { name: 'Beranda — segera hadir' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Beranda — segera hadir' })).toBeVisible();

  // Already signed in → /login sends the user home.
  await page.goto('/login');
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole('button', { name: 'Keluar' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await context.cookies()).toHaveLength(0);

  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('without a session, protected pages redirect to login with a safe next (server-side)', async ({
  page,
}) => {
  const response = await page.goto('/change-password');
  await expect(page).toHaveURL(/\/login\?next=%2Fchange-password$/);
  // The redirect happens before any protected HTML is sent.
  expect(response?.request().redirectedFrom()?.url()).toMatch(/\/change-password$/);
});

test('a forged session cookie is rejected and removed', async ({ page, context }) => {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: 'v1.forged.cookie',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/change-password');
  await expect(page).toHaveURL(/\/login\?next=%2Fchange-password$/);
  await expect.poll(async () => (await context.cookies()).length).toBe(0);
});

test('open redirects are ignored', async ({ page }) => {
  await page.goto('/login?next=//evil.com');
  await loginViaForm(page, 'budi.santoso', 'rahasia123');
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
});

test('the BFF rejects cross-site and header-less state-changing requests (CSRF)', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/login');
  // Same origin but without the CSRF header (e.g. a plain HTML form post).
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'budi.santoso', password: 'rahasia123' }),
    });
    return response.status;
  });
  expect(status).toBe(403);

  // Foreign Origin.
  const crossSite = await request.post(`${baseURL}/api/auth/login`, {
    headers: { Origin: 'https://evil.example', 'X-SafeOps-CSRF': '1' },
    data: { username: 'budi.santoso', password: 'rahasia123' },
  });
  expect(crossSite.status()).toBe(403);
});

test('the Go refresh token is never reused (no FR-10 lockout)', async ({ page, request }) => {
  await page.goto('/login');
  await loginViaForm(page, 'budi.santoso', 'rahasia123');
  await expect(page.getByRole('heading', { name: 'Beranda — segera hadir' })).toBeVisible();
  // Several parallel reloads in one browser.
  await Promise.all([page.reload(), page.reload(), page.reload()]);
  await expect(page.getByRole('heading', { name: 'Beranda — segera hadir' })).toBeVisible();
  expect((await getMockStats(request)).reuseDetected).toBe(0);
});

test('security headers are present', async ({ page }) => {
  const response = await page.goto('/login');
  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+'/);
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBe('camera=(self), geolocation=(self), microphone=()');
});
