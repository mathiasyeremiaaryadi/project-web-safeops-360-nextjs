import 'server-only';

/**
 * Headers on every BFF response:
 * - never cache authenticated data;
 * - if a response is ever opened as a page (e.g. an HTML error from Go or a gateway), it runs in
 *   a sandbox with no scripts, styles or framing. `fetch()` callers are not affected.
 */
const NO_STORE = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
};

/**
 * JSON error in the same shape as the Go backend: `{ "error": { "code", "message" } }`.
 * @param {number} status
 * @param {string} code
 * @param {string} [message]
 * @param {HeadersInit} [headers]
 */
export function errorResponse(status, code, message = '', headers = {}) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { ...NO_STORE, ...headers } },
  );
}

/**
 * JSON success response.
 * @param {unknown} body
 * @param {number} [status]
 */
export function jsonResponse(body, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

/** Empty 204 response. */
export function noContentResponse() {
  return new Response(null, { status: 204, headers: NO_STORE });
}

/** Response headers from Go that may be passed on to the browser. */
const PASSTHROUGH_HEADERS = [
  'content-type',
  'content-disposition',
  'retry-after',
  'etag',
  'last-modified',
];

/**
 * Re-emits a Go response for the browser. Drops `Set-Cookie` and every other header that is
 * not explicitly allowed, so Go tokens/cookies never reach the browser.
 * @param {Response} upstream
 */
export async function passthroughResponse(upstream) {
  const headers = new Headers(NO_STORE);
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const noBody = upstream.status === 204 || upstream.status === 304;
  const body = noBody ? null : await upstream.arrayBuffer();
  return new Response(body, { status: upstream.status, headers });
}

/**
 * Returns a copy of `response` with extra `Set-Cookie` headers.
 * @param {Response} response
 * @param {string[]} cookies
 */
export function withCookies(response, cookies) {
  if (cookies.length === 0) return response;
  const headers = new Headers(response.headers);
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(response.body, { status: response.status, headers });
}
