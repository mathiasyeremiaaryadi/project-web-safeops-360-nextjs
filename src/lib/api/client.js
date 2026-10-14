import ky from 'ky';
import { ApiError, toApiError } from '@/lib/api/errors';
import { ERROR_CODES } from '@/lib/constants';

/*
 * Browser HTTP client. It talks ONLY to the Next.js BFF on the same origin (`/api/...`).
 * Authentication is the encrypted HttpOnly session cookie, sent automatically by the browser:
 * this code never sees, stores or refreshes a token — the BFF does that server-side.
 */

/** Header required by the BFF on state-changing requests (CSRF defence, see server/bff/security.js). */
export const CSRF_HEADER = 'X-SafeOps-CSRF';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** @type {() => void} */
let onSessionExpired = () => {};

/**
 * Registers what happens when the BFF reports that the session is gone (401): clear local
 * state and go to the login page. Called once at start-up by the auth feature
 * (`features/auth/lib/setup-auth-client.js`), which keeps `lib/` free of feature imports.
 * @param {() => void} handler
 */
export function registerSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

/** @type {() => void} */
let onPasswordChangeRequired = () => {};

/**
 * Registers what happens when the API answers 403 because the user must change the password
 * first (`must_change_password`): go to /change-password.
 * @param {() => void} handler
 */
export function registerPasswordChangeRequiredHandler(handler) {
  onPasswordChangeRequired = handler;
}

/**
 * @param {Response} response A clone given to the `afterResponse` hook.
 * @returns {Promise<string | null>} The `error.code` of a JSON error body.
 */
async function readErrorCode(response) {
  try {
    const body = await response.json();
    return typeof body?.error?.code === 'string' ? body.error.code : null;
  } catch {
    return null;
  }
}

/**
 * Per-request flags passed through ky's `context` option.
 * @typedef {object} RequestContext
 * @property {boolean} [skipSessionExpired] A 401 is an expected answer (login, session probe),
 *   not a reason to redirect.
 */

/** Shared ky instance for the BFF. */
export const httpClient = ky.create({
  prefix: '/api',
  credentials: 'same-origin',
  timeout: 15_000,
  retry: { limit: 1, methods: ['get'] },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        if (!SAFE_METHODS.has(request.method.toUpperCase())) request.headers.set(CSRF_HEADER, '1');
      },
    ],
    afterResponse: [
      ({ options, response }) => {
        if (response.status !== 401) return;
        const context = /** @type {RequestContext} */ (options.context ?? {});
        if (!context.skipSessionExpired) onSessionExpired();
      },
      async ({ response }) => {
        if (response.status !== 403) return;
        if ((await readErrorCode(response)) === ERROR_CODES.PASSWORD_CHANGE_REQUIRED) {
          onPasswordChangeRequired();
        }
      },
    ],
  },
});

/**
 * Performs a request to the BFF and validates the JSON response with a Zod schema.
 *
 * @template {import('zod').ZodType} TSchema
 * @param {object} params
 * @param {'get' | 'post' | 'put' | 'patch' | 'delete'} params.method
 * @param {string} params.path Path relative to `/api`, e.g. `auth/me` or `v1/sites`.
 * @param {unknown} [params.json] JSON request body.
 * @param {FormData} [params.body] Multipart body (uploads).
 * @param {Record<string, string | number | boolean | null | undefined>} [params.searchParams]
 *   Query string; empty values are dropped.
 * @param {TSchema | null} [params.schema] Response schema; `null` for empty (204) responses.
 * @param {RequestContext} [params.context]
 * @param {number} [params.timeout] Overrides the default 15 s timeout (uploads).
 * @returns {Promise<TSchema extends import('zod').ZodType ? import('zod').infer<TSchema> : void>}
 * @throws {ApiError}
 */
export async function apiRequest({
  method,
  path,
  json,
  body,
  searchParams,
  schema = null,
  context = {},
  timeout,
}) {
  let response;
  try {
    response = await httpClient(path, {
      method,
      json,
      body,
      searchParams: cleanSearchParams(searchParams),
      context,
      ...(timeout ? { timeout } : {}),
    });
  } catch (error) {
    throw toApiError(error);
  }

  if (!schema) return /** @type {any} */ (undefined);

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw invalidResponse(path, 'body is not valid JSON');
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    // Log only the path and the failing keys — never the body.
    throw invalidResponse(
      path,
      parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
    );
  }
  return parsed.data;
}

/**
 * Drops empty values so `?q=&page=` never reaches the API.
 * @param {Record<string, string | number | boolean | null | undefined> | undefined} params
 */
function cleanSearchParams(params) {
  if (!params) return undefined;
  /** @type {Record<string, string>} */
  const clean = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') clean[key] = String(value);
  }
  return clean;
}

/**
 * @param {string} path
 * @param {string} detail
 */
function invalidResponse(path, detail) {
  console.error(`[api] Invalid response from ${path}: ${detail}`);
  return new ApiError({ status: 200, code: ERROR_CODES.INVALID_RESPONSE });
}
