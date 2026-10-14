import 'server-only';
import { readJsonWithLimit } from '@/server/http/body';
import { getServerEnv } from '@/config/env';
import { getForwardedHeaders, goFetch } from '@/server/go/go-client';
import { sessionFromTokenResponse } from '@/server/go/session-tokens';
import {
  buildClearedSessionCookies,
  buildSessionCookie,
  readSession,
} from '@/server/session/session-cookie';
import {
  errorResponse,
  jsonResponse,
  noContentResponse,
  passthroughResponse,
  withCookies,
} from '@/server/bff/responses';
import { rejectCrossSiteRequest } from '@/server/bff/security';
import {
  callWithSession,
  proxyWithSession,
  unauthorizedResponse,
  upstreamErrorResponse,
} from '@/server/bff/with-session';
import { changePasswordRequestSchema, loginRequestSchema } from '@/features/auth/api/schemas';

/*
 * BFF Route Handler implementations for /api/auth/*. The Go tokens never leave the server:
 * the browser only receives the encrypted, HttpOnly session cookie.
 */

/** Login and password forms are tiny; anything larger is rejected before parsing. */
const MAX_AUTH_BODY_BYTES = 16 * 1024;

/**
 * Parses a JSON body (at most 16 KiB) with a schema.
 * @template {import('zod').ZodType} T
 * @param {Request} request
 * @param {T} schema
 * @returns {Promise<{ data: import('zod').infer<T> } | { error: Response }>}
 */
async function parseJsonBody(request, schema) {
  let body;
  try {
    body = await readJsonWithLimit(request, MAX_AUTH_BODY_BYTES);
  } catch {
    return { error: errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Data terlalu besar.') };
  }
  if (body === undefined) {
    return { error: errorResponse(400, 'VALIDATION_ERROR', 'Format data tidak valid.') };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: errorResponse(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.') };
  }
  return { data: parsed.data };
}

/**
 * `POST /api/auth/login` — logs in at Go, stores the tokens in the session cookie and returns
 * the user profile (`{ user }`), saving the browser a second round trip.
 * @param {Request} request
 */
export async function handleLogin(request) {
  const rejected = rejectCrossSiteRequest(request);
  if (rejected) return rejected;

  const parsed = await parseJsonBody(request, loginRequestSchema);
  if ('error' in parsed) return parsed.error;

  const { SESSION_SECRET } = getServerEnv();
  const forwarded = getForwardedHeaders(request);

  try {
    const loginResponse = await goFetch('auth/login', {
      method: 'POST',
      json: parsed.data,
      headers: forwarded,
    });
    if (!loginResponse.ok) return passthroughResponse(loginResponse);

    const session = await sessionFromTokenResponse(loginResponse);
    const meResponse = await goFetch('auth/me', { accessToken: session.at, headers: forwarded });
    if (!meResponse.ok) {
      // Do not leave a half-created session behind.
      await goFetch('auth/logout', {
        method: 'POST',
        accessToken: session.at,
        refreshToken: session.rt,
        json: { refresh_token: session.rt },
        headers: forwarded,
      }).catch(() => {});
      return passthroughResponse(meResponse);
    }

    const user = await meResponse.json();
    return withCookies(jsonResponse({ user }), [
      buildSessionCookie(request, session, SESSION_SECRET),
    ]);
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

/**
 * `GET /api/auth/me` — current user. Refreshes the Go access token when needed.
 * @param {Request} request
 */
export function handleMe(request) {
  return proxyWithSession(request, (accessToken, forwarded) =>
    goFetch('auth/me', { accessToken, headers: forwarded }),
  );
}

/**
 * `POST /api/auth/logout` — revokes the session at Go (best effort) and always clears the cookie.
 * @param {Request} request
 */
export async function handleLogout(request) {
  const rejected = rejectCrossSiteRequest(request);
  if (rejected) return rejected;

  const { SESSION_SECRET } = getServerEnv();
  const session = readSession(request, SESSION_SECRET);
  if (session) {
    try {
      const response = await goFetch('auth/logout', {
        method: 'POST',
        accessToken: session.at,
        refreshToken: session.rt,
        json: { refresh_token: session.rt },
        headers: getForwardedHeaders(request),
      });
      await response.body?.cancel();
    } catch {
      // Go unreachable: the local session is removed anyway.
    }
  }
  return withCookies(noContentResponse(), buildClearedSessionCookies(request));
}

/**
 * `POST /api/auth/logout-all` — revokes every session of the current user at Go, then clears
 * the cookie.
 * @param {Request} request
 */
export async function handleLogoutAll(request) {
  const rejected = rejectCrossSiteRequest(request);
  if (rejected) return rejected;

  try {
    const { upstream, cookies } = await callWithSession(request, (accessToken, forwarded) =>
      goFetch('auth/logout-all', { method: 'POST', accessToken, headers: forwarded }),
    );
    if (!upstream) return unauthorizedResponse(cookies);
    if (!upstream.ok) return withCookies(await passthroughResponse(upstream), cookies);
    await upstream.body?.cancel();
    return withCookies(noContentResponse(), buildClearedSessionCookies(request));
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

/**
 * `PUT /api/auth/password` — changes the password. On success Go revokes every refresh token
 * (PRD FR-12), so the session cookie is cleared too.
 * @param {Request} request
 */
export async function handleChangePassword(request) {
  const rejected = rejectCrossSiteRequest(request);
  if (rejected) return rejected;

  const parsed = await parseJsonBody(request, changePasswordRequestSchema);
  if ('error' in parsed) return parsed.error;

  try {
    const { upstream, cookies } = await callWithSession(request, (accessToken, forwarded) =>
      goFetch('auth/password', {
        method: 'PUT',
        accessToken,
        json: parsed.data,
        headers: forwarded,
      }),
    );
    if (!upstream) return unauthorizedResponse(cookies);
    if (upstream.ok) {
      await upstream.body?.cancel();
      return withCookies(noContentResponse(), buildClearedSessionCookies(request));
    }
    return withCookies(await passthroughResponse(upstream), cookies);
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
