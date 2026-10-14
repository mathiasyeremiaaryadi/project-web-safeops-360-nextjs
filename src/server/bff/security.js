import 'server-only';
import { errorResponse } from '@/server/bff/responses';

/** Header the browser client adds to every state-changing request (see lib/api/client.js). */
export const CSRF_HEADER = 'x-safeops-csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Host the browser used to reach the app. Behind a reverse proxy, `X-Forwarded-Host` wins.
 * @param {Request} request
 */
function getRequestHost(request) {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('host') || new URL(request.url).host;
}

/**
 * CSRF protection for cookie-authenticated, state-changing requests. Layers:
 * - the session cookie is `SameSite=Lax` (not sent on cross-site POST/PUT/DELETE);
 * - `Sec-Fetch-Site` must not be `cross-site` when the browser sends it;
 * - the `Origin` header must be present and match the host;
 * - a custom header must be present (cross-origin pages cannot add it without CORS approval).
 * @param {Request} request
 * @returns {Response | null} A 403 response when the request must be rejected.
 */
export function rejectCrossSiteRequest(request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return errorResponse(403, 'CSRF_REJECTED', 'Cross-site request rejected.');
  }

  const origin = request.headers.get('origin');
  let originHost = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || originHost !== getRequestHost(request)) {
    return errorResponse(403, 'CSRF_REJECTED', 'Cross-site request rejected.');
  }

  if (request.headers.get(CSRF_HEADER) !== '1') {
    return errorResponse(403, 'CSRF_REJECTED', 'Cross-site request rejected.');
  }
  return null;
}
