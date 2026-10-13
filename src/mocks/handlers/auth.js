import { delay, http, HttpResponse } from 'msw';
import { ROLES } from '@/lib/constants';

/*
 * Mock auth backend (dev & tests). Response shapes follow features/auth/api/schemas.js
 * and docs/ASSUMPTIONS.md.
 *
 * Accounts:
 *   budi.santoso / rahasia123  → normal login
 *   agus.pratama / Kp7mw2Rq    → must_change_password: true
 *   dewi.lestari               → always 423 (locked)
 *   rate.limited               → always 429
 *   user.nonaktif              → always 403 (inactive)
 *   network.error              → network failure
 *   server.error               → 500
 *
 * The real refresh token is an HttpOnly cookie. JS cannot emulate an HttpOnly cookie, so the
 * mock keeps the "cookie" in memory instead: reloading the page in mock mode ends the session.
 */

const API = '*/api/v1/auth';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** @returns {Record<string, { id: string, username: string, full_name: string | null, password: string, roles: string[], must_change_password: boolean, scopes: { site_ids: string[], vendor_ids: string[] } }>} */
function createUsers() {
  return {
    'budi.santoso': {
      id: '6f1c2a0e-6c3b-4b8e-9a51-1d2f3e4a5b61',
      username: 'budi.santoso',
      full_name: 'Budi Santoso',
      password: 'rahasia123',
      roles: [ROLES.WORKER],
      must_change_password: false,
      scopes: {
        site_ids: ['0b7c9d1e-2f3a-4b5c-8d6e-7f8091a2b3c4'],
        vendor_ids: ['a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'],
      },
    },
    'agus.pratama': {
      id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
      username: 'agus.pratama',
      full_name: 'Agus Pratama',
      password: 'Kp7mw2Rq',
      roles: [ROLES.WORKER],
      must_change_password: true,
      scopes: {
        site_ids: ['0b7c9d1e-2f3a-4b5c-8d6e-7f8091a2b3c4'],
        vendor_ids: ['a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'],
      },
    },
  };
}

const db = {
  users: createUsers(),
  /** @type {{ username: string, accessToken: string, refreshToken: string } | null} */
  session: null,
  counter: 0,
  /** Number of `POST /auth/refresh` calls (inspected by tests). */
  refreshCalls: 0,
};

/** Restores the initial mock state. Call between tests. */
export function resetMockDb() {
  db.users = createUsers();
  db.session = null;
  db.counter = 0;
  db.refreshCalls = 0;
}

/** Read-only access to mock state for assertions in tests. */
export function getMockState() {
  return { refreshCalls: db.refreshCalls, hasSession: db.session !== null };
}

/**
 * Starts a session for `username` (used by tests to skip the login form).
 * @param {string} username
 * @returns {string} The access token.
 */
export function createMockSession(username) {
  return issueTokens(username).access_token;
}

/** Expires the current access token (keeps the refresh token valid). */
export function expireMockAccessToken() {
  if (db.session) db.session.accessToken = `expired-${db.session.accessToken}`;
}

/** @param {string} username */
function issueTokens(username) {
  db.counter += 1;
  db.session = {
    username,
    accessToken: `mock-access-${db.counter}`,
    refreshToken: `mock-refresh-${db.counter}`,
  };
  return {
    access_token: db.session.accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
  };
}

/**
 * @param {number} status
 * @param {string} code
 * @param {string} message
 */
function errorResponse(status, code, message) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

/** @param {Request} request */
function authenticate(request) {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!db.session || !token || token !== db.session.accessToken) return null;
  return db.users[db.session.username] ?? null;
}

/** @param {{ password: string }} user */
function toMe(user) {
  const { password: _password, ...me } = /** @type {any} */ (user);
  return me;
}

export const authHandlers = [
  http.post(`${API}/login`, async ({ request }) => {
    await delay(150);
    const body = /** @type {{ username?: string, password?: string }} */ (await request.json());
    const username = String(body.username ?? '');

    switch (username) {
      case 'dewi.lestari':
        return errorResponse(423, 'AUTH_ACCOUNT_LOCKED', 'Account is temporarily locked.');
      case 'rate.limited':
        return errorResponse(429, 'RATE_LIMITED', 'Too many requests.');
      case 'user.nonaktif':
        return errorResponse(403, 'AUTH_ACCOUNT_INACTIVE', 'Account is inactive.');
      case 'network.error':
        return HttpResponse.error();
      case 'server.error':
        return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error.');
      default:
        break;
    }

    const user = db.users[username];
    if (!user || user.password !== body.password) {
      return errorResponse(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid username or password.');
    }
    return HttpResponse.json(issueTokens(username));
  }),

  http.post(`${API}/refresh`, async () => {
    db.refreshCalls += 1;
    await delay(50);
    if (!db.session) {
      return errorResponse(401, 'AUTH_REFRESH_INVALID', 'Refresh token is invalid or expired.');
    }
    return HttpResponse.json(issueTokens(db.session.username));
  }),

  http.post(`${API}/logout`, () => {
    db.session = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/me`, ({ request }) => {
    const user = authenticate(request);
    if (!user) return errorResponse(401, 'AUTH_UNAUTHORIZED', 'Unauthorized.');
    return HttpResponse.json(toMe(user));
  }),

  http.put(`${API}/password`, async ({ request }) => {
    await delay(150);
    const user = authenticate(request);
    if (!user) return errorResponse(401, 'AUTH_UNAUTHORIZED', 'Unauthorized.');

    const body = /** @type {{ current_password?: string, new_password?: string }} */ (
      await request.json()
    );
    if (body.current_password !== user.password) {
      return errorResponse(400, 'AUTH_INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
    }
    const next = String(body.new_password ?? '');
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'Password baru minimal 8 karakter dan mengandung huruf serta angka.',
      );
    }
    if (next === user.password) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'Password baru harus berbeda dari password lama.',
      );
    }

    user.password = next;
    user.must_change_password = false;
    // PRD FR-12: changing the password revokes every refresh token.
    db.session = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
