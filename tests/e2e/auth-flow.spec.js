import { expect, test } from '@playwright/test';

/*
 * Behaviour that needs no signed-in user. None of these requests reach the Go backend:
 * the BFF answers them itself (no session, forged cookie, CSRF rejection).
 */

const SESSION_COOKIE = '__Host-safeops_session';

test('without a session, protected pages redirect to login with a safe next (server-side)', async ({
  page,
}) => {
  const response = await page.goto('/change-password');
  await expect(page).toHaveURL(/\/login\?next=%2Fchange-password$/);
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

test('the BFF rejects cross-site and header-less state-changing requests (CSRF)', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/login');
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'csrf.check', password: 'x' }),
    });
    return response.status;
  });
  expect(status).toBe(403);

  const crossSite = await request.post(`${baseURL}/api/auth/login`, {
    headers: { Origin: 'https://evil.example', 'X-SafeOps-CSRF': '1' },
    data: { username: 'csrf.check', password: 'x' },
  });
  expect(crossSite.status()).toBe(403);
});

test('login form validates required fields on the client', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByText('Username wajib diisi')).toBeVisible();
  await expect(page.getByText('Password wajib diisi')).toBeVisible();
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
