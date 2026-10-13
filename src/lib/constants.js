/** User roles, as defined in the PRD. */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  ADMIN_WORKER: 'ADMIN_WORKER',
  WORKER: 'WORKER',
});

/** Application routes. */
export const ROUTES = Object.freeze({
  HOME: '/',
  LOGIN: '/login',
  CHANGE_PASSWORD: '/change-password',
  OFFLINE: '/offline',
});

/** Error codes used by the backend and by the client-side error normalizer. */
export const ERROR_CODES = Object.freeze({
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_INACTIVE: 'AUTH_ACCOUNT_INACTIVE',
  AUTH_INVALID_CURRENT_PASSWORD: 'AUTH_INVALID_CURRENT_PASSWORD',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  // Client-side codes
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  UNKNOWN: 'UNKNOWN',
});

/**
 * Brand colors for places that cannot read CSS variables (web manifest, `<meta name="theme-color">`).
 * Keep in sync with the tokens in `app/globals.css`.
 */
export const BRAND_COLORS = Object.freeze({
  THEME: '#0B3C49', // --brand-dark
  BACKGROUND: '#F6F9FA', // --background
});
