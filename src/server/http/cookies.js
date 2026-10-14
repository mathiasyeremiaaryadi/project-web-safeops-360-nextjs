import 'server-only';

/**
 * Minimal cookie helpers that work with the standard `Request`/`Response` objects, so BFF
 * handlers stay framework-agnostic and unit-testable.
 */

/**
 * Parses a `Cookie` request header.
 * @param {string | null} header
 * @returns {Map<string, string>}
 */
export function parseCookieHeader(header) {
  const cookies = new Map();
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name && !cookies.has(name)) {
      try {
        cookies.set(name, decodeURIComponent(value));
      } catch {
        cookies.set(name, value);
      }
    }
  }
  return cookies;
}

/**
 * @typedef {object} CookieOptions
 * @property {number} [maxAge] Seconds. `0` deletes the cookie.
 * @property {string} [path]
 * @property {boolean} [httpOnly]
 * @property {boolean} [secure]
 * @property {'Strict' | 'Lax' | 'None'} [sameSite]
 */

/**
 * Serializes a `Set-Cookie` header value.
 * @param {string} name
 * @param {string} value
 * @param {CookieOptions} [options]
 */
export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
    if (options.maxAge <= 0) parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

/**
 * @typedef {object} ParsedSetCookie
 * @property {string} name
 * @property {string} value
 * @property {number | null} maxAgeSeconds Remaining lifetime, from `Max-Age` or `Expires`.
 */

/**
 * Parses one `Set-Cookie` response header value.
 * @param {string} header
 * @param {number} [now]
 * @returns {ParsedSetCookie | null}
 */
export function parseSetCookie(header, now = Date.now()) {
  const [pair, ...attributes] = header.split(';');
  const index = pair.indexOf('=');
  if (index === -1) return null;
  const name = pair.slice(0, index).trim();
  let value = pair.slice(index + 1).trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep raw value
  }

  let maxAgeSeconds = null;
  for (const attribute of attributes) {
    const [key, ...rest] = attribute.trim().split('=');
    const attrValue = rest.join('=');
    if (key.toLowerCase() === 'max-age') {
      const parsed = Number(attrValue);
      if (Number.isFinite(parsed)) maxAgeSeconds = parsed;
    } else if (key.toLowerCase() === 'expires' && maxAgeSeconds === null) {
      const time = Date.parse(attrValue);
      if (Number.isFinite(time)) maxAgeSeconds = Math.floor((time - now) / 1000);
    }
  }
  return { name, value, maxAgeSeconds };
}

/**
 * Reads all `Set-Cookie` headers of a response.
 * @param {Response} response
 * @returns {string[]}
 */
export function getSetCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}
