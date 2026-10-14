import 'server-only';
import { getServerEnv } from '@/config/env';
import { GoUnavailableError, getForwardedHeaders } from '@/server/go/go-client';
import { InvalidTokenResponseError, refreshSession } from '@/server/go/session-tokens';
import {
  buildClearedSessionCookies,
  buildSessionCookie,
  hasSessionCookie,
  readSession,
} from '@/server/session/session-cookie';
import { errorResponse, passthroughResponse, withCookies } from '@/server/bff/responses';

/** Refresh the access token proactively when it expires within this window. */
const ACCESS_TOKEN_REFRESH_MARGIN_MS = 30_000;

/**
 * @typedef {(accessToken: string, forwardedHeaders: Record<string, string>) => Promise<Response>} GoCall
 */

/**
 * @typedef {object} SessionCallResult
 * @property {Response | null} upstream Go response, or `null` when there is no usable session.
 * @property {string[]} cookies `Set-Cookie` values to send to the browser.
 */

/**
 * Runs `call` against the Go backend with the user's access token:
 * 1. reads and decrypts the session cookie (missing/invalid → no session);
 * 2. refreshes the access token first when it is (about to be) expired;
 * 3. on a Go 401, refreshes once and retries the call once;
 * 4. writes the rotated session back as a cookie, or clears it when the session is gone.
 * @param {Request} request
 * @param {GoCall} call
 * @returns {Promise<SessionCallResult>}
 * @throws {GoUnavailableError | InvalidTokenResponseError}
 */
export async function callWithSession(request, call) {
  const { SESSION_SECRET } = getServerEnv();
  const forwarded = getForwardedHeaders(request);
  const clearIfPresent = hasSessionCookie(request) ? buildClearedSessionCookies(request) : [];

  let session = readSession(request, SESSION_SECRET);
  if (!session) return { upstream: null, cookies: clearIfPresent };

  let refreshed = false;
  if (session.atExp - Date.now() < ACCESS_TOKEN_REFRESH_MARGIN_MS) {
    session = await refreshSession(session, forwarded);
    refreshed = true;
    if (!session) return { upstream: null, cookies: buildClearedSessionCookies(request) };
  }

  let upstream = await call(session.at, forwarded);

  if (upstream.status === 401 && !refreshed) {
    await upstream.body?.cancel();
    session = await refreshSession(session, forwarded);
    refreshed = true;
    if (!session) return { upstream: null, cookies: buildClearedSessionCookies(request) };
    upstream = await call(session.at, forwarded);
  }

  if (upstream.status === 401) {
    await upstream.body?.cancel();
    return { upstream: null, cookies: buildClearedSessionCookies(request) };
  }

  return {
    upstream,
    cookies: refreshed ? [buildSessionCookie(request, session, SESSION_SECRET)] : [],
  };
}

/** 401 for the browser when there is no usable session. */
export function unauthorizedResponse(/** @type {string[]} */ cookies = []) {
  return withCookies(errorResponse(401, 'AUTH_UNAUTHORIZED', 'Sesi berakhir.'), cookies);
}

/**
 * Maps unexpected errors to safe responses (never leaks details to the browser).
 * @param {unknown} error
 */
export function upstreamErrorResponse(error) {
  if (error instanceof GoUnavailableError) {
    return errorResponse(502, 'UPSTREAM_UNAVAILABLE', 'Server tidak dapat dihubungi.');
  }
  if (error instanceof InvalidTokenResponseError) {
    console.error(`[bff] ${error.message}`);
    return errorResponse(502, 'UPSTREAM_INVALID_RESPONSE', 'Respons server tidak valid.');
  }
  console.error('[bff] Unexpected error', error instanceof Error ? error.name : typeof error);
  return errorResponse(500, 'INTERNAL_ERROR', 'Terjadi kesalahan.');
}

/**
 * Convenience wrapper: calls Go with the session and returns the Go response to the browser,
 * including session cookie updates.
 * @param {Request} request
 * @param {GoCall} call
 */
export async function proxyWithSession(request, call) {
  try {
    const { upstream, cookies } = await callWithSession(request, call);
    if (!upstream) return unauthorizedResponse(cookies);
    return withCookies(await passthroughResponse(upstream), cookies);
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
