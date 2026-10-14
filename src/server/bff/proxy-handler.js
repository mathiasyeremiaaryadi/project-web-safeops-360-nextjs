import 'server-only';
import { goFetch } from '@/server/go/go-client';
import { errorResponse } from '@/server/bff/responses';
import { rejectCrossSiteRequest } from '@/server/bff/security';
import { proxyWithSession, unauthorizedResponse } from '@/server/bff/with-session';
import { readBodyWithLimit } from '@/server/http/body';
import { hasSessionCookie } from '@/server/session/session-cookie';

/**
 * Largest request body the proxy forwards: a 10 MiB SOP PDF plus the multipart envelope and
 * form fields. Go enforces the exact per-file limits.
 */
const MAX_BODY_BYTES = 11 * 1024 * 1024;

/** Uploads (multipart) get more time: Go also stores the file in object storage. */
const UPLOAD_TIMEOUT_MS = 60_000;

/** Request headers from the browser that may be forwarded to Go. */
const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept', 'if-none-match', 'if-modified-since'];

/** Only plain path segments are accepted (no `..`, no encoded slashes, no empty parts). */
const SEGMENT_PATTERN = /^[A-Za-z0-9._~-]+$/;

/**
 * Creates a Route Handler that forwards `/api/v1/<path>` to the Go backend `/api/v1/<path>`,
 * adding the user's access token server-side.
 *
 * Security:
 * - only paths whose first segment is in `allow` are forwarded (default deny);
 * - `auth/*` is never proxied — it has dedicated handlers in `features/auth/server`;
 * - browser cookies and `Authorization` are never forwarded; Go `Set-Cookie` is dropped;
 * - state-changing methods require same-origin + CSRF header.
 *
 * @param {{ allow: readonly string[] }} options First path segments that may be proxied,
 *   e.g. `['sites', 'vendors']`.
 * @returns {(request: Request, context: { params: Promise<{ path?: string[] }> }) => Promise<Response>}
 */
export function createProxyHandler({ allow }) {
  const allowed = new Set(allow.filter((segment) => segment !== 'auth'));

  return async function proxyHandler(request, { params }) {
    const { path = [] } = await params;
    if (
      path.length === 0 ||
      !allowed.has(path[0]) ||
      !path.every((segment) => SEGMENT_PATTERN.test(segment) && segment !== '..' && segment !== '.')
    ) {
      return errorResponse(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.');
    }

    const rejected = rejectCrossSiteRequest(request);
    if (rejected) return rejected;

    // Without a session cookie nothing can be proxied: answer before reading any body, so an
    // anonymous client cannot make the server buffer uploads.
    if (!hasSessionCookie(request)) return unauthorizedResponse();

    const method = request.method.toUpperCase();
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        // Buffered (so the request can be replayed once after a token refresh), with a limit.
        body = await readBodyWithLimit(request, MAX_BODY_BYTES);
      } catch {
        return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Data terlalu besar.');
      }
    }

    /** @type {Record<string, string>} */
    const headers = {};
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers[name] = value;
    }

    const { search } = new URL(request.url);
    const target = `${path.join('/')}${search}`;

    return proxyWithSession(request, (accessToken, forwarded) =>
      goFetch(target, {
        method,
        accessToken,
        body: body && body.byteLength > 0 ? body : null,
        headers: { ...headers, ...forwarded },
        timeoutMs: headers['content-type']?.startsWith('multipart/')
          ? UPLOAD_TIMEOUT_MS
          : undefined,
      }),
    );
  };
}
