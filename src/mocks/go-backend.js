import { createSeed } from './go/seed.js';
import { fail, matchPattern } from './go/http.js';
import { createSessionStore } from './go/sessions.js';
import { authRoutes } from './handlers/auth.js';
import { userRoutes } from './handlers/users.js';
import { auditLogRoutes } from './handlers/audit-logs.js';
import { siteRoutes } from './handlers/sites.js';
import { vendorRoutes } from './handlers/vendors.js';
import { itemRoutes } from './handlers/items.js';

/*
 * In-memory imitation of the Go API (`/api/v1/*`), following docs/ASSUMPTIONS.md.
 * Framework-free so the same logic powers:
 *   - Vitest (MSW handlers, src/mocks/handlers/go-api.js),
 *   - `pnpm dev` in mock mode and Playwright (node:http server, src/mocks/go-mock-server.js).
 * One handler file per feature lives in src/mocks/handlers/.
 *
 * Accounts (see go/seed.js):
 *   superadmin / Admin12345 (SUPER_ADMIN) · rina.admin / Admin12345 (ADMIN) ·
 *   budi.santoso / rahasia123 (WORKER) · agus.pratama / Kp7mw2Rq (must change password) ·
 *   sari.wulandari / Sementara1 (must change password).
 *   Special usernames: dewi.lestari (423), rate.limited (429), user.nonaktif (403),
 *   server.error (500), network.error (dropped connection).
 */

/** Endpoints a `must_change_password` user may still call (BRD 5.1). */
const ALLOWED_BEFORE_PASSWORD_CHANGE = [
  'auth/me',
  'auth/password',
  'auth/logout',
  'auth/logout-all',
];

/**
 * @param {{ refreshCookieName?: string, accessTtlSeconds?: number }} [options]
 */
export function createGoBackend(options = {}) {
  /** @type {import('./go/seed.js').MockDb} */
  let database = createSeed();
  let auditId = 1000;
  const db = () => database;
  const sessions = createSessionStore({
    refreshCookieName: options.refreshCookieName ?? 'refresh_token',
    accessTtlSeconds: options.accessTtlSeconds ?? 15 * 60,
  });

  /** @param {{ action: string, entity: string, entity_id?: string | null, actor: any, summary: string, before?: any, after?: any }} entry */
  const audit = ({ actor, ...entry }) => {
    auditId += 1;
    database.auditLogs.push({
      id: auditId,
      entity_id: null,
      before: null,
      after: null,
      ...entry,
      actor_username: actor?.username ?? null,
      ip: '127.0.0.1',
      created_at: new Date().toISOString(),
    });
  };

  const ctx = { db, sessions, audit };
  /** @type {import('./go/http.js').Route[]} */
  const routes = [
    ...authRoutes(ctx),
    ...userRoutes(ctx),
    ...auditLogRoutes(ctx),
    ...siteRoutes(ctx),
    ...vendorRoutes(ctx),
    ...itemRoutes(ctx),
  ];

  /**
   * @param {import('./go/http.js').MockRequest} req
   * @returns {import('./go/http.js').MockResponse}
   */
  function handle(req) {
    sessions.stats.lastForwardedFor =
      req.header('x-forwarded-for') ?? sessions.stats.lastForwardedFor;
    const path = req.path.replace(/^\/+|\/+$/g, '');
    const method = req.method.toUpperCase();

    for (const route of routes) {
      if (route.method !== method) continue;
      const params = matchPattern(route.pattern, path);
      if (!params) continue;
      if (route.public) return route.handle(req, params, null);

      const session = sessions.authenticate(req);
      const user = session && database.users.find((u) => u.id === session.userId);
      if (!session || !user) return fail(401, 'AUTH_UNAUTHORIZED', 'Unauthorized.');
      if (user.must_change_password && !ALLOWED_BEFORE_PASSWORD_CHANGE.includes(path)) {
        return fail(403, 'PASSWORD_CHANGE_REQUIRED', 'Password must be changed first.');
      }
      return route.handle(req, params, { ...session, user });
    }
    return fail(404, 'NOT_FOUND', 'Not found.');
  }

  return {
    handle,
    db,
    reset() {
      database = createSeed();
      sessions.reset();
    },
    /** Restores one seed account (password, flags) and revokes its sessions. @param {string} username */
    resetUser(username) {
      const seed = createSeed().users.find((u) => u.username === username);
      const index = database.users.findIndex((u) => u.username === username);
      if (seed && index >= 0) {
        sessions.revokeUser(database.users[index].id);
        database.users[index] = seed;
      }
    },
    expireAccessTokens: sessions.expireAccessTokens,
    setAccessTtl: sessions.setAccessTtl,
    stats: () => ({
      ...sessions.stats,
      activeSessions: [...sessions.sessions().values()].filter((s) => !s.revoked && !s.rotatedTo)
        .length,
    }),
  };
}

/** @typedef {ReturnType<typeof createGoBackend>} GoBackend */
