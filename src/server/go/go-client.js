import 'server-only';
import { getServerEnv } from '@/config/env';

/** Timeout for every call from the BFF to the Go backend. */
const GO_TIMEOUT_MS = 15_000;

/** Thrown when the Go backend cannot be reached (network error, DNS, timeout). */
export class GoUnavailableError extends Error {
  constructor(/** @type {string} */ message = 'Go backend unavailable') {
    super(message);
    this.name = 'GoUnavailableError';
  }
}

/**
 * Headers describing the end user, forwarded so the Go backend can rate-limit per client IP
 * and record the device of each session. The Go backend must only trust them from the BFF.
 * @param {Request} request Incoming browser request.
 * @returns {Record<string, string>}
 */
export function getForwardedHeaders(request) {
  /** @type {Record<string, string>} */
  const headers = {};
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent');
  const language = request.headers.get('accept-language');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;
  if (realIp) headers['X-Real-IP'] = realIp;
  if (userAgent) headers['User-Agent'] = userAgent;
  if (language) headers['Accept-Language'] = language;
  return headers;
}

/**
 * @typedef {object} GoRequestOptions
 * @property {string} [method]
 * @property {string} [accessToken] Sent as `Authorization: Bearer`.
 * @property {string} [refreshToken] Sent as the Go refresh cookie.
 * @property {unknown} [json] JSON body.
 * @property {BodyInit | null} [body] Raw body (proxy).
 * @property {Record<string, string>} [headers]
 */

/**
 * Calls the Go backend (server-to-server). Never throws for HTTP error statuses.
 * @param {string} path Path under `/api/v1`, e.g. `auth/me` or `sites?page=2`.
 * @param {GoRequestOptions} [options]
 * @returns {Promise<Response>}
 * @throws {GoUnavailableError}
 */
export async function goFetch(path, options = {}) {
  const env = getServerEnv();
  const headers = new Headers(options.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  if (options.accessToken) headers.set('Authorization', `Bearer ${options.accessToken}`);
  if (options.refreshToken) {
    headers.set(
      'Cookie',
      `${env.GO_REFRESH_COOKIE_NAME}=${encodeURIComponent(options.refreshToken)}`,
    );
  }

  let body = options.body ?? null;
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }

  try {
    return await fetch(`${env.API_ORIGIN}/api/v1/${path.replace(/^\/+/, '')}`, {
      method: options.method ?? 'GET',
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(GO_TIMEOUT_MS),
    });
  } catch {
    // Do not include the error: it may contain request details.
    throw new GoUnavailableError();
  }
}
