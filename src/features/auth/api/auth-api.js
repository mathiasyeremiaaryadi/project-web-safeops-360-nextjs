import { apiRequest } from '@/lib/api/client';
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  loginResponseSchema,
  meResponseSchema,
} from '@/features/auth/api/schemas';

/*
 * Calls to the BFF auth endpoints (`/api/auth/*`). The BFF talks to Go and keeps the tokens
 * server-side in the encrypted session cookie.
 */

/**
 * `POST /api/auth/login`. Sets the session cookie and returns the user profile.
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<import('./schemas').SessionUser>}
 */
export async function login(credentials) {
  const { user } = await apiRequest({
    method: 'post',
    path: 'auth/login',
    json: loginRequestSchema.parse(credentials),
    schema: loginResponseSchema,
    context: { skipSessionExpired: true },
  });
  return user;
}

/**
 * `GET /api/auth/me`. The BFF refreshes the Go access token when needed.
 * @param {{ probe?: boolean }} [options] `probe`: a 401 is expected (e.g. on /login) and must
 *   not trigger the session-expired redirect.
 * @returns {Promise<import('./schemas').SessionUser>}
 */
export function getMe({ probe = false } = {}) {
  return apiRequest({
    method: 'get',
    path: 'auth/me',
    schema: meResponseSchema,
    context: { skipSessionExpired: probe },
  });
}

/**
 * `POST /api/auth/logout`. Revokes the session and clears the cookie.
 * @returns {Promise<void>}
 */
export function logout() {
  return apiRequest({ method: 'post', path: 'auth/logout', context: { skipSessionExpired: true } });
}

/**
 * `PUT /api/auth/password` → 204. Every session of the user is revoked (PRD FR-12) and the
 * session cookie is cleared.
 * @param {{ current_password: string, new_password: string }} body
 * @returns {Promise<void>}
 */
export function changePassword(body) {
  return apiRequest({
    method: 'put',
    path: 'auth/password',
    json: changePasswordRequestSchema.parse(body),
  });
}

/**
 * `POST /api/auth/logout-all`. Revokes every session of the current user.
 * @returns {Promise<void>}
 */
export function logoutAll() {
  return apiRequest({ method: 'post', path: 'auth/logout-all' });
}
