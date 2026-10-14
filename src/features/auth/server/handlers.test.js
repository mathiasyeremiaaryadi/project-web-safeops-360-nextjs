// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { bffRequest, goBackend, GO_ORIGIN, server } from '../../../../tests/unit/msw.js';
import {
  handleChangePassword,
  handleLogin,
  handleLogout,
  handleMe,
} from '@/features/auth/server/handlers';
import { getSessionCookieName } from '@/server/session/session-cookie';

/** @param {Response} response */
function sessionCookieFrom(response) {
  const header = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${getSessionCookieName()}=`));
  return header ?? null;
}

/** @param {Response} response → `name=value` for the next request */
function cookiePair(response) {
  return sessionCookieFrom(response)?.split(';')[0] ?? null;
}

/** @param {string} username @param {string} password */
async function login(username, password) {
  return handleLogin(
    bffRequest('/api/auth/login', { method: 'POST', json: { username, password } }),
  );
}

describe('POST /api/auth/login', () => {
  it('returns the user and an encrypted HttpOnly session cookie — never the Go tokens', async () => {
    const response = await login('  Budi.Santoso ', 'rahasia123');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.user).toMatchObject({ username: 'budi.santoso', must_change_password: false });
    const text = JSON.stringify(body);
    expect(text).not.toContain('go-access');
    expect(text).not.toContain('go-refresh');

    const cookie = sessionCookieFrom(response);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('go-access');
    expect(cookie).not.toContain('go-refresh');
    // Go's own refresh cookie must not leak to the browser.
    expect(response.headers.getSetCookie().join()).not.toContain('refresh_token=');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each([
    ['budi.santoso', 'salah', 401, 'AUTH_INVALID_CREDENTIALS'],
    ['dewi.lestari', 'x', 423, 'AUTH_ACCOUNT_LOCKED'],
    ['rate.limited', 'x', 429, 'RATE_LIMITED'],
    ['user.nonaktif', 'x', 403, 'AUTH_ACCOUNT_INACTIVE'],
    ['server.error', 'x', 500, 'INTERNAL_ERROR'],
  ])('passes the Go error through for %s', async (username, password, status, code) => {
    const response = await login(username, password);
    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
    expect(sessionCookieFrom(response)).toBeNull();
  });

  it('answers 502 when Go is unreachable', async () => {
    const response = await login('network.error', 'x');
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('rejects an invalid body', async () => {
    const response = await handleLogin(
      bffRequest('/api/auth/login', { method: 'POST', json: { username: '' } }),
    );
    expect(response.status).toBe(400);
  });

  it('forwards the client IP and user agent to Go', async () => {
    await handleLogin(
      bffRequest('/api/auth/login', {
        method: 'POST',
        json: { username: 'budi.santoso', password: 'rahasia123' },
        headers: { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'Android Chrome' },
      }),
    );
    expect(goBackend.stats().lastForwardedFor).toBe('203.0.113.7');
  });
});

describe('CSRF protection', () => {
  const body = { username: 'budi.santoso', password: 'rahasia123' };

  it.each([
    ['no Origin header', { origin: null }],
    ['a foreign Origin', { origin: 'https://evil.example' }],
    ['no CSRF header', { csrf: false }],
    ['Sec-Fetch-Site: cross-site', { headers: { 'sec-fetch-site': 'cross-site' } }],
  ])('rejects a state-changing request with %s', async (_label, init) => {
    const response = await handleLogin(
      bffRequest('/api/auth/login', { method: 'POST', json: body, ...init }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('CSRF_REJECTED');
    expect(goBackend.stats().logins).toBe(0);
  });

  it('accepts the Origin of a reverse proxy (X-Forwarded-Host)', async () => {
    const response = await handleLogin(
      bffRequest('/api/auth/login', {
        method: 'POST',
        json: body,
        origin: 'https://safeops.pln.example',
        headers: { 'x-forwarded-host': 'safeops.pln.example' },
      }),
    );
    expect(response.status).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the profile for a valid session', async () => {
    const cookie = cookiePair(await login('agus.pratama', 'Kp7mw2Rq'));
    const response = await handleMe(bffRequest('/api/auth/me', { cookie }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      username: 'agus.pratama',
      must_change_password: true,
    });
    expect(sessionCookieFrom(response)).toBeNull(); // nothing changed
  });

  it('answers 401 without a session cookie', async () => {
    const response = await handleMe(bffRequest('/api/auth/me'));
    expect(response.status).toBe(401);
    expect(sessionCookieFrom(response)).toBeNull();
  });

  it('answers 401 and clears a forged cookie', async () => {
    const response = await handleMe(
      bffRequest('/api/auth/me', { cookie: `${getSessionCookieName()}=v1.forged.value` }),
    );
    expect(response.status).toBe(401);
    expect(sessionCookieFrom(response)).toContain('Max-Age=0');
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the Go session and clears the cookie', async () => {
    const cookie = cookiePair(await login('budi.santoso', 'rahasia123'));
    expect(goBackend.stats().activeSessions).toBe(1);

    const response = await handleLogout(bffRequest('/api/auth/logout', { method: 'POST', cookie }));
    expect(response.status).toBe(204);
    expect(sessionCookieFrom(response)).toContain('Max-Age=0');
    expect(goBackend.stats().activeSessions).toBe(0);

    // The old cookie no longer works.
    expect((await handleMe(bffRequest('/api/auth/me', { cookie }))).status).toBe(401);
  });

  it('clears the cookie even when Go is down', async () => {
    const cookie = cookiePair(await login('budi.santoso', 'rahasia123'));
    server.use(http.post(`${GO_ORIGIN}/api/v1/auth/logout`, () => HttpResponse.error()));
    const response = await handleLogout(bffRequest('/api/auth/logout', { method: 'POST', cookie }));
    expect(response.status).toBe(204);
    expect(sessionCookieFrom(response)).toContain('Max-Age=0');
  });
});

describe('PUT /api/auth/password', () => {
  it('changes the password, revokes every session and clears the cookie', async () => {
    const cookie = cookiePair(await login('agus.pratama', 'Kp7mw2Rq'));
    const response = await handleChangePassword(
      bffRequest('/api/auth/password', {
        method: 'PUT',
        cookie,
        json: { current_password: 'Kp7mw2Rq', new_password: 'barubaru1' },
      }),
    );
    expect(response.status).toBe(204);
    expect(sessionCookieFrom(response)).toContain('Max-Age=0');
    expect(goBackend.stats().activeSessions).toBe(0);
    expect((await login('agus.pratama', 'barubaru1')).status).toBe(200);
  });

  it('passes a wrong current password through as 400 and keeps the session', async () => {
    const cookie = cookiePair(await login('agus.pratama', 'Kp7mw2Rq'));
    const response = await handleChangePassword(
      bffRequest('/api/auth/password', {
        method: 'PUT',
        cookie,
        json: { current_password: 'salah123', new_password: 'barubaru1' },
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('AUTH_INVALID_CURRENT_PASSWORD');
    expect(sessionCookieFrom(response)).toBeNull();
  });
});
