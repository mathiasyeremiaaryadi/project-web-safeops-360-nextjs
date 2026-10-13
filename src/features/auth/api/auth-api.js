import { apiRequest } from '@/lib/api/client';
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  meResponseSchema,
  tokenResponseSchema,
} from '@/features/auth/api/schemas';

/** Requests that must not carry the access token nor trigger a refresh on 401. */
const PUBLIC_AUTH_CONTEXT = { skipAuth: true, skipRefresh: true };

/**
 * `POST /auth/login`. The backend sets the refresh token as an HttpOnly cookie.
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<import('./schemas').TokenResponse>}
 */
export function login(credentials) {
  return apiRequest({
    method: 'post',
    path: 'auth/login',
    json: loginRequestSchema.parse(credentials),
    schema: tokenResponseSchema,
    context: PUBLIC_AUTH_CONTEXT,
  });
}

/**
 * `POST /auth/refresh`. Rotates the refresh cookie and returns a new access token.
 * Do not call directly — use `refreshAccessToken()` from `@/lib/api/client` (single-flight).
 * @returns {Promise<import('./schemas').TokenResponse>}
 */
export function refresh() {
  return apiRequest({
    method: 'post',
    path: 'auth/refresh',
    schema: tokenResponseSchema,
    context: PUBLIC_AUTH_CONTEXT,
  });
}

/**
 * `POST /auth/logout`. Revokes the current session.
 * @returns {Promise<void>}
 */
export function logout() {
  return apiRequest({ method: 'post', path: 'auth/logout', context: { skipRefresh: true } });
}

/**
 * `GET /auth/me`.
 * @returns {Promise<import('./schemas').SessionUser>}
 */
export function getMe() {
  return apiRequest({ method: 'get', path: 'auth/me', schema: meResponseSchema });
}

/**
 * `PUT /auth/password` → 204. Revokes every refresh token of the user (PRD FR-12).
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
