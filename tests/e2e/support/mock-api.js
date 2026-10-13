/**
 * Mocks the Go auth API for one Playwright page with `page.route`.
 * The refresh token is sent as a real `HttpOnly; Secure; SameSite=Strict` cookie, exactly as
 * documented in docs/ASSUMPTIONS.md; the session validity itself is tracked in memory here.
 */

const PASSWORD_RULES = (value) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

function createUsers() {
  const scopes = {
    site_ids: ['0b7c9d1e-2f3a-4b5c-8d6e-7f8091a2b3c4'],
    vendor_ids: ['a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'],
  };
  return {
    'budi.santoso': {
      id: '6f1c2a0e-6c3b-4b8e-9a51-1d2f3e4a5b61',
      username: 'budi.santoso',
      full_name: 'Budi Santoso',
      password: 'rahasia123',
      roles: ['WORKER'],
      must_change_password: false,
      scopes,
    },
    'agus.pratama': {
      id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
      username: 'agus.pratama',
      full_name: 'Agus Pratama',
      password: 'Kp7mw2Rq',
      roles: ['WORKER'],
      must_change_password: true,
      scopes,
    },
  };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ sessionFor?: string }} [options] Start with a valid refresh cookie for this user.
 */
export async function mockAuthApi(page, options = {}) {
  const state = {
    users: createUsers(),
    /** @type {{ username: string, accessToken: string } | null} */
    session: null,
    counter: 0,
    refreshCalls: 0,
  };

  const issue = (username) => {
    state.counter += 1;
    state.session = { username, accessToken: `e2e-access-${state.counter}` };
    return {
      body: { access_token: state.session.accessToken, token_type: 'Bearer', expires_in: 900 },
      cookie: `refresh_token=e2e-refresh-${state.counter}; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
    };
  };

  if (options.sessionFor) issue(options.sessionFor);

  const json = (route, status, body, headers = {}) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers,
      body: JSON.stringify(body),
    });
  const error = (route, status, code, message = '') =>
    json(route, status, { error: { code, message } });

  const currentUser = (request) => {
    const token = (request.headers().authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!state.session || token !== state.session.accessToken) return null;
    return state.users[state.session.username];
  };

  await page.route('**/api/v1/auth/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const endpoint = `${request.method()} ${pathname.replace('/api/v1/auth', '')}`;

    switch (endpoint) {
      case 'POST /login': {
        const { username, password } = request.postDataJSON();
        if (username === 'dewi.lestari') return error(route, 423, 'AUTH_ACCOUNT_LOCKED');
        if (username === 'rate.limited') return error(route, 429, 'RATE_LIMITED');
        const user = state.users[username];
        if (!user || user.password !== password) {
          return error(route, 401, 'AUTH_INVALID_CREDENTIALS');
        }
        const { body, cookie } = issue(username);
        return json(route, 200, body, { 'set-cookie': cookie });
      }
      case 'POST /refresh': {
        state.refreshCalls += 1;
        if (!state.session) return error(route, 401, 'AUTH_REFRESH_INVALID');
        const { body, cookie } = issue(state.session.username);
        return json(route, 200, body, { 'set-cookie': cookie });
      }
      case 'POST /logout':
        state.session = null;
        return route.fulfill({ status: 204 });
      case 'GET /me': {
        const user = currentUser(request);
        if (!user) return error(route, 401, 'AUTH_UNAUTHORIZED');
        const { password: _password, ...me } = user;
        return json(route, 200, me);
      }
      case 'PUT /password': {
        const user = currentUser(request);
        if (!user) return error(route, 401, 'AUTH_UNAUTHORIZED');
        const { current_password: current, new_password: next } = request.postDataJSON();
        if (current !== user.password) return error(route, 400, 'AUTH_INVALID_CURRENT_PASSWORD');
        if (!PASSWORD_RULES(next) || next === current) {
          return error(route, 400, 'VALIDATION_ERROR', 'Password baru tidak valid.');
        }
        user.password = next;
        user.must_change_password = false;
        state.session = null; // FR-12: all refresh tokens revoked
        return route.fulfill({ status: 204 });
      }
      default:
        return error(route, 404, 'NOT_FOUND');
    }
  });

  return state;
}
