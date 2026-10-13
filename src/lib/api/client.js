import ky from 'ky';
import { ApiError, toApiError } from '@/lib/api/errors';
import { ERROR_CODES } from '@/lib/constants';

/**
 * @typedef {object} AuthHandlers
 * @property {() => string | null} getAccessToken Returns the in-memory access token.
 * @property {() => Promise<string | null>} refresh Calls `POST /auth/refresh`, stores the new
 *   access token and returns it, or returns `null` when the session cannot be restored.
 * @property {() => void} onSessionExpired Clears the session and sends the user to the login page.
 */

/** @type {AuthHandlers} */
let authHandlers = {
  getAccessToken: () => null,
  refresh: async () => null,
  onSessionExpired: () => {},
};

/**
 * Wires the auth feature into the shared HTTP client. Called once at app start-up
 * (see `features/auth/lib/setup-auth-client.js`), which keeps `lib/` free of feature imports.
 * @param {AuthHandlers} handlers
 */
export function registerAuthHandlers(handlers) {
  authHandlers = handlers;
}

/** @type {Promise<string | null> | null} */
let refreshPromise = null;

/**
 * Refreshes the access token with a single-flight guarantee: concurrent callers share one
 * in-flight `POST /auth/refresh`. Reusing a rotated refresh token is treated by the backend
 * as token theft (PRD FR-10) and revokes every session, so this must never run twice in parallel.
 * @returns {Promise<string | null>} The new access token, or `null` if refresh failed.
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = authHandlers
      .refresh()
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Decides which token to retry a 401 request with. A 401 can arrive after another request
 * already finished refreshing, so the refresh endpoint is only called when the token that
 * was sent is still the current one.
 * @param {Request} request The request that received 401.
 * @returns {Promise<string | null>} Token to retry with, or `null` to end the session.
 */
async function resolveTokenAfter401(request) {
  const sentToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
  const currentToken = authHandlers.getAccessToken();

  // Someone else refreshed meanwhile → just retry with the new token.
  if (currentToken && currentToken !== sentToken) return currentToken;
  // The session was cleared after this request was sent (e.g. a refresh already failed).
  if (sentToken && !currentToken) return null;
  return refreshAccessToken();
}

/**
 * Per-request flags passed through ky's `context` option.
 * @typedef {object} RequestContext
 * @property {boolean} [skipAuth] Do not attach the `Authorization` header.
 * @property {boolean} [skipRefresh] Do not try to refresh the token on 401 (login, refresh).
 */

/** Shared ky instance. All API calls go through `/api/v1` on the same origin. */
export const httpClient = ky.create({
  prefix: '/api/v1',
  credentials: 'include',
  timeout: 15_000,
  retry: { limit: 1, methods: ['get'] },
  hooks: {
    beforeRequest: [
      ({ request, options }) => {
        const context = /** @type {RequestContext} */ (options.context ?? {});
        if (context.skipAuth) return;
        const token = authHandlers.getAccessToken();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async ({ request, options, response, retryCount }) => {
        if (response.status !== 401) return;
        const context = /** @type {RequestContext} */ (options.context ?? {});
        if (context.skipRefresh) return;

        if (retryCount === 0) {
          const token = await resolveTokenAfter401(request);
          if (token) {
            const headers = new Headers(request.headers);
            headers.set('Authorization', `Bearer ${token}`);
            // Forced retries are allowed for every method (ky skips the method check),
            // so POST/PUT are repeated exactly once after a successful refresh.
            return ky.retry({
              request: new Request(request, { headers }),
              code: 'TOKEN_REFRESHED',
            });
          }
        }

        // Refresh failed, or the retried request is still unauthorized.
        authHandlers.onSessionExpired();
      },
    ],
  },
});

/**
 * Performs a request and validates the JSON response with a Zod schema.
 *
 * @template {import('zod').ZodType} TSchema
 * @param {object} params
 * @param {'get' | 'post' | 'put' | 'patch' | 'delete'} params.method
 * @param {string} params.path Path relative to `/api/v1`, e.g. `auth/me`.
 * @param {unknown} [params.json] JSON request body.
 * @param {TSchema | null} [params.schema] Response schema; `null` for empty (204) responses.
 * @param {RequestContext} [params.context]
 * @returns {Promise<TSchema extends import('zod').ZodType ? import('zod').infer<TSchema> : void>}
 * @throws {ApiError}
 */
export async function apiRequest({ method, path, json, schema = null, context = {} }) {
  let response;
  try {
    response = await httpClient(path, { method, json, context });
  } catch (error) {
    throw toApiError(error);
  }

  if (!schema) return /** @type {any} */ (undefined);

  let body;
  try {
    body = await response.json();
  } catch {
    throw invalidResponse(path, 'body is not valid JSON');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Log only the path and the failing keys — never the body, which may contain tokens.
    throw invalidResponse(
      path,
      parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
    );
  }
  return parsed.data;
}

/**
 * @param {string} path
 * @param {string} detail
 */
function invalidResponse(path, detail) {
  console.error(`[api] Invalid response from ${path}: ${detail}`);
  return new ApiError({ status: 200, code: ERROR_CODES.INVALID_RESPONSE });
}
