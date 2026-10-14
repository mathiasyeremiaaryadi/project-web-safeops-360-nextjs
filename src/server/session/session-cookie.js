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

/** Whether cookies are marked `Secure` (production) — also enables the `__Host-` prefix. */
export function isSecureCookieEnv() {
  return process.env.NODE_ENV === 'production';
}

/** Name of the session cookie. `__Host-` forces Secure, Path=/ and no Domain in browsers. */
export function getSessionCookieName() {
  return isSecureCookieEnv() ? SESSION_COOKIE_NAME.SECURE : SESSION_COOKIE_NAME.DEV;
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
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const session = unsealSession(cookies.get(getSessionCookieName()), secret);
  if (!session || session.rtExp <= now) return null;
  return session;
}

/** Whether the request carries a session cookie at all (valid or not). */
export function hasSessionCookie(/** @type {Request} */ request) {
  return parseCookieHeader(request.headers.get('cookie')).has(getSessionCookieName());
}

/**
 * `Set-Cookie` value that stores the session until the refresh token expires.
 * @param {SessionPayload} session
 * @param {string} secret
 * @param {number} [now]
 */
export function buildSessionCookie(session, secret, now = Date.now()) {
  return serializeCookie(getSessionCookieName(), sealSession(session, secret), {
    path: '/',
    httpOnly: true,
    secure: isSecureCookieEnv(),
    sameSite: 'Lax',
    maxAge: Math.max(0, Math.floor((session.rtExp - now) / 1000)),
  });
}

/** `Set-Cookie` value that deletes the session cookie. */
export function buildClearedSessionCookie() {
  return serializeCookie(getSessionCookieName(), '', {
    path: '/',
    httpOnly: true,
    secure: isSecureCookieEnv(),
    sameSite: 'Lax',
    maxAge: 0,
  });
}
