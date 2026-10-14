// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  getSessionCookieName,
  readSession,
  sealSession,
  unsealSession,
} from '@/server/session/session-cookie';

const SECRET = 'unit-test-secret-0123456789abcdefghijklmnop';
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
      headers: { cookie: `${getSessionCookieName()}=${expired}` },
    });
    expect(readSession(request, SECRET)).toBeNull();
  });

  it('builds an HttpOnly, SameSite=Lax cookie that lives as long as the refresh token', () => {
    const now = Date.now();
    const cookie = buildSessionCookie({ ...payload, rtExp: now + 7200_000 }, SECRET, now);
    expect(cookie).toMatch(new RegExp(`^${getSessionCookieName()}=v1\\.`));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=7200');
    expect(buildClearedSessionCookie()).toContain('Max-Age=0');
  });
});
