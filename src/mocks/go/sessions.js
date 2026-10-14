/*
 * Access/refresh token store of the mock Go backend, with rotation and reuse detection
 * (PRD FR-10: presenting an already-rotated refresh token revokes every session of the user).
 */

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/** @param {{ refreshCookieName: string, accessTtlSeconds: number }} options */
export function createSessionStore(options) {
  let accessTtlSeconds = options.accessTtlSeconds;
  /** @type {Map<string, { userId: string, accessToken: string, rotatedTo: string | null, revoked: boolean }>} */
  let sessions = new Map();
  /** @type {Map<string, { userId: string, exp: number, refreshToken: string }>} */
  let accessTokens = new Map();
  let counter = 0;
  const stats = {
    logins: 0,
    refreshCalls: 0,
    reuseDetected: 0,
    lastForwardedFor: /** @type {string | null} */ (null),
  };

  function reset() {
    sessions = new Map();
    accessTokens = new Map();
    counter = 0;
    Object.assign(stats, { logins: 0, refreshCalls: 0, reuseDetected: 0, lastForwardedFor: null });
  }

  /** @param {string} userId */
  function revokeUser(userId) {
    for (const session of sessions.values()) if (session.userId === userId) session.revoked = true;
    for (const [token, info] of accessTokens)
      if (info.userId === userId) accessTokens.delete(token);
  }

  /** @param {string} userId */
  function issue(userId) {
    counter += 1;
    const id = `${counter}-${Math.random().toString(36).slice(2, 10)}`;
    const accessToken = `go-access-${id}`;
    const refreshToken = `go-refresh-${id}`;
    sessions.set(refreshToken, { userId, accessToken, rotatedTo: null, revoked: false });
    accessTokens.set(accessToken, {
      userId,
      exp: Date.now() + accessTtlSeconds * 1000,
      refreshToken,
    });
    return {
      status: 200,
      body: { access_token: accessToken, token_type: 'Bearer', expires_in: accessTtlSeconds },
      setCookies: [
        `${options.refreshCookieName}=${refreshToken}; Path=/api/v1/auth; Max-Age=${REFRESH_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
      ],
    };
  }

  /**
   * @param {import('./http.js').MockRequest} req
   * @returns {{ userId: string, refreshToken: string } | null}
   */
  function authenticate(req) {
    const token = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const info = accessTokens.get(token);
    if (!info || info.exp <= Date.now()) return null;
    const session = sessions.get(info.refreshToken);
    if (!session || session.revoked) return null;
    return { userId: info.userId, refreshToken: info.refreshToken };
  }

  /** @param {import('./http.js').MockRequest} req */
  function readRefreshToken(req) {
    const cookie = req.header('cookie') ?? '';
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${options.refreshCookieName}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
    return typeof req.body?.refresh_token === 'string' ? req.body.refresh_token : null;
  }

  return {
    stats,
    sessions: () => sessions,
    reset,
    revokeUser,
    issue,
    authenticate,
    readRefreshToken,
    /** @param {number} seconds */
    setAccessTtl(seconds) {
      accessTtlSeconds = seconds;
    },
    expireAccessTokens() {
      for (const info of accessTokens.values()) info.exp = 0;
    },
    /** @param {string} refreshToken */
    rotate(refreshToken) {
      const session = sessions.get(refreshToken);
      if (!session || session.revoked) return { error: 'invalid' };
      if (session.rotatedTo) {
        stats.reuseDetected += 1;
        revokeUser(session.userId);
        return { error: 'reused' };
      }
      const issued = issue(session.userId);
      session.rotatedTo = issued.body.access_token;
      accessTokens.delete(session.accessToken);
      return { issued };
    },
    /** @param {string | null} refreshToken */
    revoke(refreshToken) {
      const session = refreshToken ? sessions.get(refreshToken) : undefined;
      if (!session) return;
      session.revoked = true;
      accessTokens.delete(session.accessToken);
    },
  };
}

/** @typedef {ReturnType<typeof createSessionStore>} SessionStore */
