import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { parseCookieHeader, serializeCookie } from '@/server/http/cookies';
import { SESSION_COOKIE_NAME } from '@/server/session/cookie-names';

/*
 * Encrypted, stateless session cookie.
 *
 * The Go access + refresh tokens live ONLY inside this cookie, encrypted with AES-256-GCM using a
 * key derived from SESSION_SECRET. The cookie is HttpOnly, so browser JavaScript can neither read
 * nor decrypt it. GCM authenticates the ciphertext: any tampering makes decryption fail.
 */

const FORMAT_VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Contents of the session cookie. Times are epoch milliseconds. */
export const sessionPayloadSchema = z.object({
  /** Go access token. */
  at: z.string().min(1),
  /** Access token expiry. */
  atExp: z.number().int(),
  /** Go refresh token. */
  rt: z.string().min(1),
  /** Refresh token (and therefore session) expiry. */
  rtExp: z.number().int(),
});

/** @typedef {z.infer<typeof sessionPayloadSchema>} SessionPayload */

/**
 * Whether the browser reached the app over HTTPS (directly or via a TLS-terminating proxy that
 * sets `X-Forwarded-Proto`). Browsers drop `Secure` cookies on plain-HTTP sites, so the cookie
 * is only marked `Secure` (and gets the `__Host-` prefix) on HTTPS.
 * @param {Request} request
 */
export function isSecureRequest(request) {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwarded) return forwarded === 'https';
  return new URL(request.url).protocol === 'https:';
}

/**
 * Name of the session cookie for this request. `__Host-` forces Secure, Path=/, no Domain.
 * @param {Request} request
 */
export function getSessionCookieName(request) {
  return isSecureRequest(request) ? SESSION_COOKIE_NAME.SECURE : SESSION_COOKIE_NAME.DEV;
}

/**
 * Raw session cookie value, whichever name it was stored under.
 * @param {Request} request
 */
function readSessionCookieValue(request) {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  return cookies.get(SESSION_COOKIE_NAME.SECURE) ?? cookies.get(SESSION_COOKIE_NAME.DEV);
}

/** @param {string} secret */
function deriveKey(secret) {
  return createHash('sha256').update(`safeops-session:${secret}`).digest();
}

/**
 * Encrypts a session payload.
 * @param {SessionPayload} payload
 * @param {string} secret
 * @returns {string}
 */
export function sealSession(payload, secret) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  cipher.setAAD(Buffer.from(FORMAT_VERSION));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    FORMAT_VERSION,
    iv.toString('base64url'),
    Buffer.concat([ciphertext, tag]).toString('base64url'),
  ].join('.');
}

/**
 * Decrypts and validates a session cookie value. Returns `null` for anything invalid
 * (tampered, wrong key, unknown version, malformed) — callers treat it as "no session".
 * @param {string | undefined | null} value
 * @param {string} secret
 * @returns {SessionPayload | null}
 */
export function unsealSession(value, secret) {
  if (!value) return null;
  const [version, ivPart, dataPart] = value.split('.');
  if (version !== FORMAT_VERSION || !ivPart || !dataPart) return null;
  try {
    const iv = Buffer.from(ivPart, 'base64url');
    const data = Buffer.from(dataPart, 'base64url');
    if (iv.length !== IV_BYTES || data.length <= TAG_BYTES) return null;
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv);
    decipher.setAAD(Buffer.from(FORMAT_VERSION));
    decipher.setAuthTag(data.subarray(data.length - TAG_BYTES));
    const plaintext = Buffer.concat([
      decipher.update(data.subarray(0, data.length - TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8');
    const parsed = sessionPayloadSchema.safeParse(JSON.parse(plaintext));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Reads the session from a request. Expired sessions (refresh token past its expiry) are `null`.
 * @param {Request} request
 * @param {string} secret
 * @param {number} [now]
 * @returns {SessionPayload | null}
 */
export function readSession(request, secret, now = Date.now()) {
  const session = unsealSession(readSessionCookieValue(request), secret);
  if (!session || session.rtExp <= now) return null;
  return session;
}

/** Whether the request carries a session cookie at all (valid or not). */
export function hasSessionCookie(/** @type {Request} */ request) {
  return readSessionCookieValue(request) !== undefined;
}

/**
 * `Set-Cookie` value that stores the session until the refresh token expires.
 * @param {Request} request The incoming request (decides Secure / cookie name).
 * @param {SessionPayload} session
 * @param {string} secret
 * @param {number} [now]
 */
export function buildSessionCookie(request, session, secret, now = Date.now()) {
  return serializeCookie(getSessionCookieName(request), sealSession(session, secret), {
    path: '/',
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'Lax',
    maxAge: Math.max(0, Math.floor((session.rtExp - now) / 1000)),
  });
}

/**
 * `Set-Cookie` value that deletes the session cookie.
 * @param {Request} request
 */
export function buildClearedSessionCookie(request) {
  return clearCookie(getSessionCookieName(request), isSecureRequest(request));
}

/**
 * `Set-Cookie` values that delete EVERY session cookie the request carries: the one for its
 * protocol, plus the other name if present (e.g. a `__Host-` cookie sent over plain HTTP, which
 * this request would otherwise never clear).
 * @param {Request} request
 * @returns {string[]}
 */
export function buildClearedSessionCookies(request) {
  const own = getSessionCookieName(request);
  const present = parseCookieHeader(request.headers.get('cookie'));
  const others = Object.values(SESSION_COOKIE_NAME).filter(
    (name) => name !== own && present.has(name),
  );
  return [
    buildClearedSessionCookie(request),
    // `__Host-` cookies can only be changed with Secure.
    ...others.map((name) => clearCookie(name, name === SESSION_COOKIE_NAME.SECURE)),
  ];
}

/** @param {string} name @param {boolean} secure */
function clearCookie(name, secure) {
  return serializeCookie(name, '', {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    maxAge: 0,
  });
}
