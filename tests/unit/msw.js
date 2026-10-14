import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createGoBackend } from '@/mocks/go-backend';
import { createGoApiHandlers } from '@/mocks/handlers/go-api';
import {
  handleChangePassword,
  handleLogin,
  handleLogout,
  handleMe,
} from '@/features/auth/server/handlers';
import { createProxyHandler } from '@/server/bff/proxy-handler';
import { API_PROXY_ALLOWLIST } from '@/server/bff/proxy-allowlist';

/*
 * Test network:
 *
 *   component (jsdom, ky) ──▶ MSW "BFF bridge" ──▶ REAL Route Handler code ──▶ MSW mock Go
 *   http://localhost:3000/api/*                    (src/features/auth/server,   http://go.test
 *                                                   src/server/bff)             /api/v1/auth/*
 *
 * The bridge plays the browser's part for cookies: it keeps a cookie jar, sends the cookies
 * back and adds the `Origin` header a real browser would send.
 */

export const GO_ORIGIN = process.env.API_ORIGIN ?? 'http://go.test';
export const APP_ORIGIN = 'http://localhost:3000';

/** Mock Go backend (reset after every test). */
export const goBackend = createGoBackend();

/** Browser cookie jar of the bridge: name → value. */
export const cookieJar = new Map();

/** Proxy allowlist used by tests: the app's real allowlist. */
export const TEST_PROXY_ALLOWLIST = API_PROXY_ALLOWLIST;
const proxyHandler = createProxyHandler({ allow: TEST_PROXY_ALLOWLIST });

/** @type {Record<string, (request: Request) => Promise<Response> | Response>} */
const BFF_ROUTES = {
  'POST /api/auth/login': handleLogin,
  'GET /api/auth/me': handleMe,
  'POST /api/auth/logout': handleLogout,
  'PUT /api/auth/password': handleChangePassword,
};

/** @param {Response} response */
function storeCookies(response) {
  for (const header of response.headers.getSetCookie()) {
    const [pair, ...attributes] = header.split(';');
    const index = pair.indexOf('=');
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    const expired = attributes.some((a) => /^\s*max-age=0\s*$/i.test(a));
    if (expired || !value) cookieJar.delete(name);
    else cookieJar.set(name, value);
  }
}

const bffBridge = http.all(`${APP_ORIGIN}/api/*`, async ({ request }) => {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.set('origin', APP_ORIGIN);
  headers.set('host', url.host);
  if (cookieJar.size > 0) {
    headers.set('cookie', [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; '));
  }
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  const bffRequest = new Request(request.url, { method, headers, body });

  /** @type {Response} */
  let response;
  const route = BFF_ROUTES[`${method} ${url.pathname}`];
  if (route) {
    response = await route(bffRequest);
  } else if (url.pathname.startsWith('/api/v1/')) {
    const path = url.pathname.slice('/api/v1/'.length).split('/');
    response = await proxyHandler(bffRequest, { params: Promise.resolve({ path }) });
  } else {
    response = HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
  storeCookies(response);
  return response;
});

/** MSW server for Vitest. */
export const server = setupServer(...createGoApiHandlers(goBackend, GO_ORIGIN), bffBridge);

/**
 * Builds a browser-like request to a BFF Route Handler (for handler-level tests).
 * @param {string} path e.g. `/api/auth/me`
 * @param {RequestInit & { json?: unknown, cookie?: string | null, origin?: string | null, csrf?: boolean }} [init]
 */
export function bffRequest(path, init = {}) {
  const { json, cookie, origin = APP_ORIGIN, csrf = true, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (origin) headers.set('origin', origin);
  headers.set('host', new URL(APP_ORIGIN).host);
  if (csrf) headers.set('x-safeops-csrf', '1');
  if (cookie) headers.set('cookie', cookie);
  if (json !== undefined) headers.set('content-type', 'application/json');
  return new Request(`${APP_ORIGIN}${path}`, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
}

/**
 * Logs in through the real BFF and stores the session cookie in the bridge jar
 * (as if the user had signed in in this browser).
 * @param {string} username
 * @param {string} password
 */
export async function loginInJar(username, password) {
  const response = await handleLogin(
    bffRequest('/api/auth/login', { method: 'POST', json: { username, password } }),
  );
  if (!response.ok) throw new Error(`loginInJar failed: ${response.status}`);
  storeCookies(response);
  return /** @type {{ user: any }} */ (await response.json()).user;
}
