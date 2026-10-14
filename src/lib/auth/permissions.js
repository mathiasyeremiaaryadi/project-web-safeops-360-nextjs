import { ROLE_PRIORITY, ROLES } from '@/lib/constants';

const { SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER } = ROLES;
const ALL_ROLES = [SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER];
const MANAGERS = [SUPER_ADMIN, ADMIN, ADMIN_WORKER];

/**
 * Permission matrix from the backend BRD, section 7 ("Roles and access matrix").
 * Used only to show/hide UI actions — the backend enforces the real authorization.
 * `label` feeds the "Ringkasan akses" panel of the user form.
 */
export const PERMISSIONS = Object.freeze({
  USER_MANAGE: { label: 'Mengelola akun user', roles: [SUPER_ADMIN, ADMIN_WORKER] },
  USER_ACCESS_ADMIN: {
    label: 'Mengatur role, scope, dan mencabut sesi user lain',
    roles: [SUPER_ADMIN],
  },
  SITE_VENDOR_READ: { label: 'Melihat site dan vendor', roles: ALL_ROLES },
  SITE_VENDOR_WRITE: { label: 'Membuat dan mengubah site serta vendor', roles: [SUPER_ADMIN] },
  INVENTORY_POLICY_READ: { label: 'Melihat inventory dan SOP', roles: ALL_ROLES },
  INVENTORY_POLICY_WRITE: { label: 'Mengelola inventory dan SOP', roles: MANAGERS },
  ITEM_WRITE: { label: 'Mengelola master task', roles: [SUPER_ADMIN] },
  PIPELINE_WRITE: { label: 'Membuat dan mengubah pipeline', roles: [SUPER_ADMIN, ADMIN] },
  PIPELINE_ITEM_WRITE: { label: 'Mengatur task di dalam pipeline', roles: MANAGERS },
  PIPELINE_REPORT_READ: { label: 'Melihat laporan task', roles: ALL_ROLES },
  PIPELINE_REPORT_REVIEW: { label: 'Mereview laporan task', roles: MANAGERS },
  INVENTORY_REPORT_CREATE: { label: 'Membuat laporan inventory', roles: ALL_ROLES },
  INVENTORY_REPORT_REVIEW: { label: 'Mereview laporan inventory', roles: MANAGERS },
  DASHBOARD_READ: { label: 'Melihat rekap harian', roles: ALL_ROLES },
  AUDIT_LOG_READ: { label: 'Melihat audit log', roles: [SUPER_ADMIN] },
});

/** @typedef {keyof typeof PERMISSIONS} Permission */

/**
 * @param {readonly string[] | undefined} roles
 * @param {Permission} permission
 */
export function rolesCan(roles, permission) {
  const allowed = PERMISSIONS[permission].roles;
  return (roles ?? []).some((role) => allowed.includes(role));
}

/**
 * Whether a user may perform an action (UI only).
 * @param {{ roles?: readonly string[] } | null | undefined} user
 * @param {Permission} permission
 */
export function can(user, permission) {
  return rolesCan(user?.roles, permission);
}

/**
 * The most privileged role of a user — drives the menu shown to multi-role users.
 * @param {readonly string[] | undefined} roles
 * @returns {string | null}
 */
export function getPrimaryRole(roles) {
  return ROLE_PRIORITY.find((role) => roles?.includes(role)) ?? null;
}

/**
 * Splits the permission labels into what the given roles can and cannot do.
 * @param {readonly string[]} roles
 */
export function describeAccess(roles) {
  const entries = Object.values(PERMISSIONS);
  return {
    allowed: entries.filter((p) => roles.some((r) => p.roles.includes(r))).map((p) => p.label),
    denied: entries.filter((p) => !roles.some((r) => p.roles.includes(r))).map((p) => p.label),
  };
}
