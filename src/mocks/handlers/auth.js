import { fail, noContent, ok } from '../go/http.js';

/*
 * Mock Go `/auth/*`. Special usernames simulate error cases:
 *   dewi.lestari → 423 · rate.limited → 429 · user.nonaktif → 403 · server.error → 500 ·
 *   network.error → dropped connection.
 */

const SPECIAL_LOGINS = {
  'dewi.lestari': () => fail(423, 'AUTH_ACCOUNT_LOCKED', 'Account is temporarily locked.'),
  'rate.limited': () => fail(429, 'RATE_LIMITED', 'Too many requests.'),
  'user.nonaktif': () => fail(403, 'AUTH_ACCOUNT_INACTIVE', 'Account is inactive.'),
  'server.error': () => fail(500, 'INTERNAL_ERROR', 'Internal server error.'),
  'network.error': () => ({ status: 0, networkError: true }),
};

/** @param {string} password */
const isStrongPassword = (password) =>
  password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

/**
 * Public profile of a user (never includes the password).
 * @param {any} user
 */
export function toUserResponse(user) {
  const { password: _password, ...rest } = user;
  return rest;
}

/**
 * @param {{ db: () => import('../go/seed.js').MockDb, sessions: import('../go/sessions.js').SessionStore }} ctx
 * @returns {import('../go/http.js').Route[]}
 */
export function authRoutes({ db, sessions }) {
  return [
    {
      method: 'POST',
      pattern: 'auth/login',
      public: true,
      handle: (req) => {
        const username = String(req.body?.username ?? '');
        const special = SPECIAL_LOGINS[/** @type {keyof typeof SPECIAL_LOGINS} */ (username)];
        if (special) return special();
        const user = db().users.find((u) => u.username === username);
        if (!user || !user.is_active || user.password !== req.body?.password) {
          return fail(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid username or password.');
        }
        sessions.stats.logins += 1;
        user.last_login_at = new Date().toISOString();
        return sessions.issue(user.id);
      },
    },
    {
      method: 'POST',
      pattern: 'auth/refresh',
      public: true,
      handle: (req) => {
        sessions.stats.refreshCalls += 1;
        const token = sessions.readRefreshToken(req);
        const result = token ? sessions.rotate(token) : { error: 'invalid' };
        if (result.error === 'reused')
          return fail(401, 'AUTH_REFRESH_REUSED', 'Refresh token reuse detected.');
        if (result.error)
          return fail(401, 'AUTH_REFRESH_INVALID', 'Refresh token is invalid or expired.');
        return result.issued;
      },
    },
    {
      method: 'POST',
      pattern: 'auth/logout',
      handle: (req, _params, auth) => {
        sessions.revoke(sessions.readRefreshToken(req) ?? auth.refreshToken);
        return noContent();
      },
    },
    {
      method: 'POST',
      pattern: 'auth/logout-all',
      handle: (_req, _params, auth) => {
        sessions.revokeUser(auth.userId);
        return noContent();
      },
    },
    {
      method: 'GET',
      pattern: 'auth/me',
      handle: (_req, _params, auth) => ok(toUserResponse(auth.user)),
    },
    {
      method: 'PUT',
      pattern: 'auth/password',
      handle: (req, _params, auth) => {
        const next = String(req.body?.new_password ?? '');
        if (req.body?.current_password !== auth.user.password) {
          return fail(400, 'AUTH_INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
        }
        if (!isStrongPassword(next)) {
          return fail(
            400,
            'VALIDATION_ERROR',
            'Password baru minimal 8 karakter dan mengandung huruf serta angka.',
          );
        }
        if (next === auth.user.password) {
          return fail(400, 'VALIDATION_ERROR', 'Password baru harus berbeda dari password lama.');
        }
        auth.user.password = next;
        auth.user.must_change_password = false;
        sessions.revokeUser(auth.userId); // FR-12
        return noContent();
      },
    },
  ];
}
