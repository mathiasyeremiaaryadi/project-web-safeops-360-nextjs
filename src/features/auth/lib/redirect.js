import { ROUTES } from '@/lib/constants';

/**
 * Returns `next` only if it is a safe internal path (prevents open redirects):
 * must start with a single `/`, must not start with `//` or `/\`, and must not
 * contain control characters or backslashes.
 * @param {string | null | undefined} next
 * @param {string} [fallback]
 * @returns {string}
 */
export function getSafeRedirect(next, fallback = ROUTES.HOME) {
  if (typeof next !== 'string' || next.length === 0) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  // Backslashes are normalized to "/" by browsers ("/\evil.com" → "//evil.com").
  if (next.includes('\\')) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(next)) return fallback;
  // Never bounce back to the login page itself.
  if (next === ROUTES.LOGIN || next.startsWith(`${ROUTES.LOGIN}?`)) return fallback;

  try {
    const base = 'http://internal.invalid';
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Builds the login URL that brings the user back to `path` afterwards.
 * @param {string} path
 */
export function buildLoginUrl(path) {
  const safe = getSafeRedirect(path, '');
  if (!safe || safe === ROUTES.HOME) return ROUTES.LOGIN;
  return `${ROUTES.LOGIN}?next=${encodeURIComponent(safe)}`;
}
