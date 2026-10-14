import 'server-only';
import { z } from 'zod';
import { getServerEnv } from '@/config/env';
import { getSetCookies, parseSetCookie } from '@/server/http/cookies';
import { goFetch } from '@/server/go/go-client';

/*
 * Turning Go token responses into BFF sessions, and refreshing them safely.
 * See docs/ASSUMPTIONS.md (A1, A2) for the contract.
 */

/**
 * Go `POST /auth/login` and `POST /auth/refresh` → 200. Only `access_token` is required: the real
 * backend does not send `token_type`/`expires_in` exactly as first assumed (docs/ASSUMPTIONS.md A1),
 * so the access-token lifetime falls back to `expires_at`, then the JWT `exp` claim, then 15 min.
 */
export const goTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.coerce.number().positive().optional().catch(undefined),
  expires_at: z.union([z.string(), z.number()]).optional().catch(undefined),
  /** Optional: if Go returns the refresh token in the body instead of a cookie. */
  refresh_token: z.string().min(1).optional(),
});

/** PRD: access tokens live ±15 minutes. */
const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60;

/**
 * Reads the `exp` claim of a JWT WITHOUT verifying it (only to schedule a refresh; Go verifies).
 * @param {string} token
 * @returns {number | null} Epoch ms.
 */
function jwtExpiry(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    );
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Access-token expiry (epoch ms) from whatever the response provides.
 * @param {z.infer<typeof goTokenResponseSchema>} data
 * @param {number} now
 */
function accessTokenExpiry(data, now) {
  if (data.expires_in) return now + data.expires_in * 1000;
  if (data.expires_at !== undefined) {
    const at =
      typeof data.expires_at === 'number' ? data.expires_at * 1000 : Date.parse(data.expires_at);
    if (Number.isFinite(at) && at > now) return at;
  }
  const fromJwt = jwtExpiry(data.access_token);
  if (fromJwt && fromJwt > now) return fromJwt;
  return now + DEFAULT_ACCESS_TTL_SECONDS * 1000;
}

/** Default refresh token lifetime when Go does not send Max-Age/Expires (PRD: ±7 days). */
const DEFAULT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Thrown when Go answered, but the token response is unusable. */
export class InvalidTokenResponseError extends Error {
  constructor(/** @type {string} */ detail) {
    super(`Invalid token response from Go: ${detail}`);
    this.name = 'InvalidTokenResponseError';
  }
}

/**
 * Builds a session from a successful Go token response (login or refresh).
 * @param {Response} response
 * @param {number} [now]
 * @returns {Promise<import('@/server/session/session-cookie').SessionPayload>}
 */
export async function sessionFromTokenResponse(response, now = Date.now()) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new InvalidTokenResponseError('body is not JSON');
  }
  const parsed = goTokenResponseSchema.safeParse(body);
  if (!parsed.success) {
    // Log the failing keys only — never the body (it contains tokens).
    throw new InvalidTokenResponseError(
      parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
    );
  }

  const { GO_REFRESH_COOKIE_NAME } = getServerEnv();
  const refreshCookie = getSetCookies(response)
    .map((header) => parseSetCookie(header, now))
    .find((cookie) => cookie?.name === GO_REFRESH_COOKIE_NAME && cookie.value);

  const refreshToken = refreshCookie?.value ?? parsed.data.refresh_token;
  if (!refreshToken) throw new InvalidTokenResponseError('missing refresh token');

  const refreshTtl =
    refreshCookie?.maxAgeSeconds && refreshCookie.maxAgeSeconds > 0
      ? refreshCookie.maxAgeSeconds
      : DEFAULT_REFRESH_TTL_SECONDS;

  return {
    at: parsed.data.access_token,
    atExp: accessTokenExpiry(parsed.data, now),
    rt: refreshToken,
    rtExp: now + refreshTtl * 1000,
  };
}

/*
 * Refresh coordination.
 *
 * Go rotates the refresh token on every refresh and treats reuse of an old one as theft
 * (PRD FR-10 → every session of the user is revoked). The BFF therefore:
 *  1. runs at most ONE refresh per refresh token at a time (single-flight), and
 *  2. remembers the result for a short grace period, so a request that still carries the old
 *     cookie (sent by the browser before it received the new one) reuses the new session
 *     instead of presenting the rotated token to Go again.
 * This state is per Node.js process; with several BFF instances use sticky sessions or ask the
 * Go team for a short reuse grace period (docs/DECISIONS.md D9).
 */

const REFRESH_RESULT_GRACE_MS = 30_000;
const REFRESH_FAILURE_GRACE_MS = 5_000;

/**
 * @type {Map<string, {
 *   promise: Promise<import('@/server/session/session-cookie').SessionPayload | null>,
 *   settledAt: number | null,
 *   ok: boolean,
 * }>}
 */
const refreshes = new Map();

/** @param {number} now */
function pruneRefreshes(now) {
  for (const [token, entry] of refreshes) {
    if (entry.settledAt === null) continue;
    const grace = entry.ok ? REFRESH_RESULT_GRACE_MS : REFRESH_FAILURE_GRACE_MS;
    if (now - entry.settledAt > grace) refreshes.delete(token);
  }
}

/**
 * Refreshes a session with the Go backend (single-flight + grace period per refresh token).
 * @param {import('@/server/session/session-cookie').SessionPayload} session
 * @param {Record<string, string>} [forwardedHeaders]
 * @returns {Promise<import('@/server/session/session-cookie').SessionPayload | null>}
 *   The new session, or `null` when the session cannot be refreshed (logged out).
 * @throws {import('@/server/go/go-client').GoUnavailableError} When Go is unreachable.
 */
export function refreshSession(session, forwardedHeaders = {}) {
  const now = Date.now();
  pruneRefreshes(now);

  const existing = refreshes.get(session.rt);
  if (existing) return existing.promise;

  const entry = {
    promise: (async () => {
      const response = await goFetch('auth/refresh', {
        method: 'POST',
        refreshToken: session.rt,
        // BRD 8.1: the cookie is the browser path; the body is the documented non-browser path.
        json: { refresh_token: session.rt },
        headers: forwardedHeaders,
      });
      if (!response.ok) return null;
      return sessionFromTokenResponse(response);
    })(),
    settledAt: /** @type {number | null} */ (null),
    ok: false,
  };
  refreshes.set(session.rt, entry);

  entry.promise.then(
    (result) => {
      entry.settledAt = Date.now();
      entry.ok = result !== null;
    },
    () => {
      // Network failures are not cached: the next request may simply retry.
      refreshes.delete(session.rt);
    },
  );
  return entry.promise;
}

/** Test helper: forget every remembered refresh. */
export function resetRefreshCache() {
  refreshes.clear();
}
