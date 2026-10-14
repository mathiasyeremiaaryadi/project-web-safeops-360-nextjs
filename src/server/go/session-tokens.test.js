// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { InvalidTokenResponseError, sessionFromTokenResponse } from '@/server/go/session-tokens';

const NOW = Date.parse('2026-10-14T03:00:00Z');
const COOKIE = 'refresh_token=rt-1; Path=/api/v1/auth; Max-Age=604800; HttpOnly';

/** @param {object} body @param {string[]} [cookies] */
function goResponse(body, cookies = [COOKIE]) {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { headers });
}

/** Unsigned JWT with an `exp` claim. @param {number} expSeconds */
const jwt = (expSeconds) =>
  `h.${Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url')}.s`;

describe('sessionFromTokenResponse', () => {
  it('uses expires_in when present', async () => {
    const session = await sessionFromTokenResponse(
      goResponse({ access_token: 'at', token_type: 'Bearer', expires_in: 900 }),
      NOW,
    );
    expect(session).toEqual({
      at: 'at',
      atExp: NOW + 900_000,
      rt: 'rt-1',
      rtExp: NOW + 604_800_000,
    });
  });

  it('accepts a lowercase token_type and a string expires_in', async () => {
    const session = await sessionFromTokenResponse(
      goResponse({ access_token: 'at', token_type: 'bearer', expires_in: '600' }),
      NOW,
    );
    expect(session.atExp).toBe(NOW + 600_000);
  });

  it('falls back to expires_at, then to the JWT exp claim, then to 15 minutes', async () => {
    const atIso = new Date(NOW + 300_000).toISOString();
    expect(
      (await sessionFromTokenResponse(goResponse({ access_token: 'at', expires_at: atIso }), NOW))
        .atExp,
    ).toBe(NOW + 300_000);
    const token = jwt(NOW / 1000 + 120);
    expect((await sessionFromTokenResponse(goResponse({ access_token: token }), NOW)).atExp).toBe(
      NOW + 120_000,
    );
    expect(
      (await sessionFromTokenResponse(goResponse({ access_token: 'opaque' }), NOW)).atExp,
    ).toBe(NOW + 900_000);
  });

  it('reads the refresh token from the body when there is no cookie', async () => {
    const session = await sessionFromTokenResponse(
      goResponse({ access_token: 'at', refresh_token: 'rt-body' }, []),
      NOW,
    );
    expect(session.rt).toBe('rt-body');
  });

  it('rejects a response without access or refresh token', async () => {
    await expect(sessionFromTokenResponse(goResponse({ token: 'x' }), NOW)).rejects.toBeInstanceOf(
      InvalidTokenResponseError,
    );
    await expect(
      sessionFromTokenResponse(goResponse({ access_token: 'at' }, []), NOW),
    ).rejects.toThrow('missing refresh token');
  });
});
