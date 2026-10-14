// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildClearedSessionCookie,
  buildClearedSessionCookies,
  buildSessionCookie,
  getSessionCookieName,
  readSession,
  sealSession,
  unsealSession,
} from '@/server/session/session-cookie';

const SECRET = 'unit-test-secret-0123456789abcdefghijklmnop';
const HTTP = new Request('http://103.150.226.7:3001/api/auth/login');
const HTTPS = new Request('https://safeops.example/api/auth/login');
const BEHIND_PROXY = new Request('http://app:3000/api/auth/login', {
  headers: { 'x-forwarded-proto': 'https' },
});
const payload = {
  at: 'go-access-1',
  atExp: Date.now() + 60_000,
  rt: 'go-refresh-1',
  rtExp: Date.now() + 3_600_000,
};

describe('session cookie', () => {
  it('round-trips an encrypted payload', () => {
    const sealed = sealSession(payload, SECRET);
    expect(unsealSession(sealed, SECRET)).toEqual(payload);
  });

  it('does not contain the tokens in clear text', () => {
    const sealed = sealSession(payload, SECRET);
    expect(sealed).not.toContain('go-access-1');
    expect(sealed).not.toContain('go-refresh-1');
    expect(Buffer.from(sealed.split('.')[2], 'base64url').toString('latin1')).not.toContain(
      'go-access',
    );
  });

  it('uses a fresh IV every time', () => {
    expect(sealSession(payload, SECRET)).not.toBe(sealSession(payload, SECRET));
  });

  it('rejects tampered, foreign-key and malformed values', () => {
    const sealed = sealSession(payload, SECRET);
    const [version, iv, data] = sealed.split('.');
    const flipped = Buffer.from(data, 'base64url');
    flipped[0] ^= 0xff;
    expect(unsealSession(`${version}.${iv}.${flipped.toString('base64url')}`, SECRET)).toBeNull();
    expect(unsealSession(sealed, `${SECRET}-other`)).toBeNull();
    expect(unsealSession('v2.abc.def', SECRET)).toBeNull();
    expect(unsealSession('garbage', SECRET)).toBeNull();
    expect(unsealSession('', SECRET)).toBeNull();
  });

  it('treats an expired refresh token as no session', () => {
    const expired = sealSession({ ...payload, rtExp: Date.now() - 1 }, SECRET);
    const request = new Request('http://localhost/', {
      headers: { cookie: `safeops_session=${expired}` },
    });
    expect(readSession(request, SECRET)).toBeNull();
  });

  it('builds an HttpOnly, SameSite=Lax cookie that lives as long as the refresh token', () => {
    const now = Date.now();
    const cookie = buildSessionCookie(HTTP, { ...payload, rtExp: now + 7200_000 }, SECRET, now);
    expect(cookie).toMatch(/^safeops_session=v1\./);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=7200');
    expect(buildClearedSessionCookie(HTTP)).toContain('Max-Age=0');
  });

  it('is not Secure on plain HTTP, so browsers keep it (deploy without TLS)', () => {
    const cookie = buildSessionCookie(HTTP, payload, SECRET);
    expect(getSessionCookieName(HTTP)).toBe('safeops_session');
    expect(cookie).not.toContain('Secure');
  });

  it('is Secure with the __Host- prefix on HTTPS, also behind a TLS proxy', () => {
    expect(buildSessionCookie(HTTPS, payload, SECRET)).toMatch(/^__Host-safeops_session=.*Secure/);
    expect(getSessionCookieName(BEHIND_PROXY)).toBe('__Host-safeops_session');
  });

  it('reads the session under either cookie name', () => {
    const value = sealSession(payload, SECRET);
    for (const name of ['safeops_session', '__Host-safeops_session']) {
      const request = new Request('http://app.test/', { headers: { cookie: `${name}=${value}` } });
      expect(readSession(request, SECRET)).toEqual(payload);
    }
  });
});

describe('buildClearedSessionCookies', () => {
  it('clears only the protocol cookie when no other session cookie is sent', () => {
    expect(buildClearedSessionCookies(HTTP)).toEqual([buildClearedSessionCookie(HTTP)]);
  });

  it('also clears a __Host- cookie sent over plain HTTP (with Secure, as browsers require)', () => {
    const request = new Request('http://localhost:3100/api/auth/me', {
      headers: { cookie: '__Host-safeops_session=v1.forged' },
    });
    const cookies = buildClearedSessionCookies(request);
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatch(/^safeops_session=;.*Max-Age=0/);
    expect(cookies[1]).toMatch(/^__Host-safeops_session=;.*Max-Age=0/);
    expect(cookies[1]).toContain('Secure');
  });
});
