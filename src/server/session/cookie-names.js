/**
 * Session cookie names. Kept free of `server-only` so `src/proxy.js` can use them too.
 * `__Host-` (production) makes browsers require Secure, Path=/ and no Domain attribute.
 */
export const SESSION_COOKIE_NAME = Object.freeze({
  SECURE: '__Host-safeops_session',
  DEV: 'safeops_session',
});
