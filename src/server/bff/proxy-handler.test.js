// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { bffRequest, GO_ORIGIN, server, TEST_PROXY_ALLOWLIST } from '../../../tests/unit/msw.js';
import { handleLogin } from '@/features/auth/server/handlers';
import { createProxyHandler } from '@/server/bff/proxy-handler';

const proxy = createProxyHandler({ allow: TEST_PROXY_ALLOWLIST });

/** @param {string[]} path */
const params = (path) => ({ params: Promise.resolve({ path }) });

async function sessionCookie() {
  const response = await handleLogin(
    bffRequest('/api/auth/login', {
      method: 'POST',
      json: { username: 'budi.santoso', password: 'rahasia123' },
    }),
  );
  return response.headers.getSetCookie()[0].split(';')[0];
}

describe('BFF proxy /api/v1/*', () => {
  it('forwards allow-listed paths with the Go access token, without browser cookies', async () => {
    const cookie = await sessionCookie();
    /** @type {Headers | null} */
    let seen = null;
    server.use(
      http.get(`${GO_ORIGIN}/api/v1/sites/42`, ({ request }) => {
        seen = request.headers;
        return HttpResponse.json(
          { id: 42 },
          { headers: { 'Set-Cookie': 'tracking=1; Path=/', 'X-Internal': 'secret' } },
        );
      }),
    );

    const response = await proxy(
      bffRequest('/api/v1/sites/42?expand=vendor', { cookie }),
      params(['sites', '42']),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 42 });
    expect(seen?.get('authorization')).toMatch(/^Bearer go-access-/);
    expect(seen?.get('cookie')).toBeNull();
    // Go headers are filtered.
    expect(response.headers.getSetCookie()).toHaveLength(0);
    expect(response.headers.get('x-internal')).toBeNull();
  });

  it('keeps the query string and replays a POST body after a refresh', async () => {
    const cookie = await sessionCookie();
    let calls = 0;
    server.use(
      http.post(`${GO_ORIGIN}/api/v1/sites`, async ({ request }) => {
        calls += 1;
        const body = await request.json();
        // First attempt: pretend the access token expired.
        if (calls === 1)
          return HttpResponse.json({ error: { code: 'AUTH_UNAUTHORIZED' } }, { status: 401 });
        return HttpResponse.json(
          { received: body, query: new URL(request.url).search },
          { status: 201 },
        );
      }),
    );

    const response = await proxy(
      bffRequest('/api/v1/sites?dry=1', { method: 'POST', cookie, json: { name: 'PLTU A' } }),
      params(['sites']),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ received: { name: 'PLTU A' }, query: '?dry=1' });
    expect(calls).toBe(2);
  });

  it.each([
    [['internal-admin'], 'not in the allowlist'],
    [['auth', 'refresh'], 'auth is never proxied'],
    [['sites', '..', 'auth'], 'path traversal'],
    [['sites', '%2e%2e'], 'encoded segment'],
    [[], 'empty path'],
  ])('rejects %j (%s) with 404', async (path) => {
    const cookie = await sessionCookie();
    const response = await proxy(bffRequest('/api/v1/x', { cookie }), params(path));
    expect(response.status).toBe(404);
  });

  it('requires a session', async () => {
    const response = await proxy(bffRequest('/api/v1/sites'), params(['sites']));
    expect(response.status).toBe(401);
  });

  it('requires same-origin + CSRF header for state-changing methods', async () => {
    const cookie = await sessionCookie();
    const response = await proxy(
      bffRequest('/api/v1/sites', { method: 'DELETE', cookie, csrf: false }),
      params(['sites']),
    );
    expect(response.status).toBe(403);
  });
});
