/** Badge per audit action (unknown actions fall back to neutral). */
export const ACTION_BADGES = Object.freeze({
  LOGIN: { label: 'LOGIN', variant: 'success' },
  LOGOUT: { label: 'LOGOUT', variant: 'neutral' },
  LOGIN_FAILED: { label: 'LOGIN_FAILED', variant: 'danger' },
  CREATE: { label: 'CREATE', variant: 'info' },
  UPDATE: { label: 'UPDATE', variant: 'warning' },
  DELETE: { label: 'DELETE', variant: 'danger' },
  RESET_PASSWORD: { label: 'RESET_PASSWORD', variant: 'revision' },
  REVOKE_SESSIONS: { label: 'REVOKE_SESSIONS', variant: 'revision' },
});

export const ACTION_FILTERS = Object.freeze([
  { value: '', label: 'Semua aksi' },
  ...Object.keys(ACTION_BADGES).map((action) => ({ value: action, label: action })),
]);

/** Entities seen in the audit trail (BRD: auth, accounts and report state changes). */
export const ENTITY_FILTERS = Object.freeze([
  { value: '', label: 'Semua entitas' },
  ...['auth', 'users', 'user_roles', 'user_scopes', 'sessions', 'pipeline_reports'].map(
    (entity) => ({
      value: entity,
      label: entity,
    }),
  ),
]);

/** Placeholder for events without a known actor (e.g. failed login with an unknown username). */
export const UNKNOWN_ACTOR = '(tidak dikenal)';
