// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { bffRequest, goBackend, GO_ORIGIN, server } from '../../../tests/unit/msw.js';
import { handleLogin, handleMe } from '@/features/auth/server/handlers';
import { getSessionCookieName, sealSession, unsealSession } from '@/server/session/session-cookie';

const SECRET = process.env.SESSION_SECRET ?? '';

/** Logs in and returns the decrypted session + the cookie pair. */
async function loginSession(username = 'budi.santoso', password = 'rahasia123') {
  const response = await handleLogin(
    bffRequest('/api/auth/login', { method: 'POST', json: { username, password } }),
  );
  const pair = response.headers.getSetCookie()[0].split(';')[0];
  const session = unsealSession(decodeURIComponent(pair.split('=').slice(1).join('=')), SECRET);
  if (!session) throw new Error('login failed');
  return session;
}

/** @param {import('@/server/session/session-cookie').SessionPayload} session */
const cookieFor = (session) => `${getSessionCookieName()}=${sealSession(session, SECRET)}`;

/** @param {Response} response */
function newSessionFrom(response) {
  const header = response.headers
    .getSetCookie()
    .find(
      (value) => value.startsWith(`${getSessionCookieName()}=`) && !value.includes('Max-Age=0'),
    );
  if (!header) return null;
  const value = header.split(';')[0].split('=').slice(1).join('=');
  return unsealSession(decodeURIComponent(value), SECRET);
}

describe('session refresh in the BFF', () => {
  it('refreshes proactively when the access token is about to expire and rotates the cookie', async () => {
    const session = await loginSession();
    const expiring = { ...session, atExp: Date.now() + 5_000 };

    const response = await handleMe(bffRequest('/api/auth/me', { cookie: cookieFor(expiring) }));
    expect(response.status).toBe(200);
    expect(goBackend.stats().refreshCalls).toBe(1);

    const rotated = newSessionFrom(response);
    expect(rotated?.rt).not.toBe(session.rt);
    expect(rotated?.at).not.toBe(session.at);
  });

  it('runs ONE refresh for 3 parallel requests with the same expired session (single-flight)', async () => {
    const session = await loginSession();
    const cookie = cookieFor({ ...session, atExp: Date.now() - 1 });
    server.use(
      http.post(`${GO_ORIGIN}/api/v1/auth/refresh`, async () => {
        await delay(50);
        return undefined; // fall through to the mock Go handler
      }),
    );

    const responses = await Promise.all([
      handleMe(bffRequest('/api/auth/me', { cookie })),
      handleMe(bffRequest('/api/auth/me', { cookie })),
      handleMe(bffRequest('/api/auth/me', { cookie })),
    ]);

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(goBackend.stats().refreshCalls).toBe(1);
    expect(goBackend.stats().reuseDetected).toBe(0);
    const tokens = new Set(responses.map((r) => newSessionFrom(r)?.rt));
    expect(tokens.size).toBe(1); // every response carries the same rotated session
  });

  it('never presents a rotated refresh token again (late request with the old cookie)', async () => {
    const session = await loginSession();
    const oldCookie = cookieFor({ ...session, atExp: Date.now() - 1 });

    const first = await handleMe(bffRequest('/api/auth/me', { cookie: oldCookie }));
    expect(first.status).toBe(200);
    // The browser had already sent this request with the old cookie before receiving the new one.
    const late = await handleMe(bffRequest('/api/auth/me', { cookie: oldCookie }));

    expect(late.status).toBe(200);
    expect(goBackend.stats().refreshCalls).toBe(1);
    expect(goBackend.stats().reuseDetected).toBe(0);
  });

  it('refreshes once and retries when Go answers 401 for a token it no longer accepts', async () => {
    const session = await loginSession();
    goBackend.expireAccessTokens();

    const response = await handleMe(bffRequest('/api/auth/me', { cookie: cookieFor(session) }));
    expect(response.status).toBe(200);
    expect(goBackend.stats().refreshCalls).toBe(1);
    expect(newSessionFrom(response)).not.toBeNull();
  });

  it('ends the session (401 + cleared cookie) when the refresh is rejected', async () => {
    const session = await loginSession();
    goBackend.reset(); // Go forgot every session (revoked / expired)

    const response = await handleMe(
      bffRequest('/api/auth/me', { cookie: cookieFor({ ...session, atExp: Date.now() - 1 }) }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie().join()).toContain('Max-Age=0');
  });

  it('answers 502 and keeps the cookie when Go is unreachable during refresh', async () => {
    const session = await loginSession();
    server.use(http.post(`${GO_ORIGIN}/api/v1/auth/refresh`, () => HttpResponse.error()));

    const response = await handleMe(
      bffRequest('/api/auth/me', { cookie: cookieFor({ ...session, atExp: Date.now() - 1 }) }),
    );
    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
});
