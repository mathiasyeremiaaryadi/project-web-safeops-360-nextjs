import { ROLE_PRIORITY, ROLES } from '@/lib/constants';

const { SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER } = ROLES;
const ALL_ROLES = [SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER];
const MANAGERS = [SUPER_ADMIN, ADMIN, ADMIN_WORKER];

/**
 * Permission matrix from the backend BRD, section 7 ("Roles and access matrix"), plus the product
 * decisions of the Admin phase (Admin reviews task reports but only reads inventory reports).
 * Used only to show/hide UI actions — the backend enforces the real authorization.
 * `label` feeds the "Ringkasan akses" panel of the user form.
 */
export const PERMISSIONS = Object.freeze({
  ALL_SITES_READ: { label: 'Melihat data semua site', roles: [SUPER_ADMIN] },
  // Admin: Admin Worker accounts of vendors at their sites; Admin Worker: Worker accounts.
  USER_MANAGE: { label: 'Mengelola akun user', roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER] },
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
  // Admin Worker only reads pipelines and their tasks.
  PIPELINE_ITEM_WRITE: { label: 'Mengatur task di dalam pipeline', roles: [SUPER_ADMIN, ADMIN] },
  // Postman: only the Admin vendor creates/changes assignments, for their own vendor.
  ASSIGNMENT_WRITE: { label: 'Menugaskan worker ke task pipeline', roles: [ADMIN_WORKER] },
  PIPELINE_REPORT_READ: { label: 'Melihat laporan task', roles: ALL_ROLES },
  PIPELINE_REPORT_REVIEW: { label: 'Mereview laporan task', roles: MANAGERS },
  INVENTORY_REPORT_CREATE: { label: 'Membuat laporan inventory', roles: ALL_ROLES },
  INVENTORY_REPORT_REVIEW: {
    label: 'Mereview laporan inventory',
    roles: [SUPER_ADMIN, ADMIN_WORKER],
  },
  DASHBOARD_READ: { label: 'Melihat rekap harian', roles: MANAGERS },
  TASK_REPORT_WRITE: { label: 'Mengerjakan task dan mengisi laporan sendiri', roles: [WORKER] },
  AUDIT_LOG_READ: { label: 'Melihat audit log', roles: [SUPER_ADMIN] },
  // SLA & maturity (prompt SLA section 2). Admin: only site overrides of their sites; the default
  // vendor rule is read-only for them. Admin vendor / Worker results access still to be confirmed
  // (docs/ASSUMPTIONS.md SL5) — revoking it is one line here.
  SLA_RULES_READ: { label: 'Melihat aturan SLA & maturity', roles: [SUPER_ADMIN, ADMIN] },
  SLA_RULES_CREATE_DEFAULT: {
    label: 'Membuat aturan SLA & maturity default vendor',
    roles: [SUPER_ADMIN],
  },
  SLA_RULES_CREATE_SITE_OVERRIDE: {
    label: 'Membuat aturan SLA & maturity khusus site',
    roles: [SUPER_ADMIN, ADMIN],
  },
  SLA_RULES_DEACTIVATE: {
    label: 'Menonaktifkan aturan SLA & maturity',
    roles: [SUPER_ADMIN, ADMIN],
  },
  SLA_RESULTS_READ: { label: 'Melihat skor SLA & maturity', roles: MANAGERS },
  SLA_RESULTS_READ_OWN: { label: 'Melihat skor SLA sendiri', roles: [WORKER] },
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

/** Which records a user works on: every site, their sites, or their one vendor. */
export const DATA_SCOPE = Object.freeze({ ALL: 'ALL', SITE: 'SITE', VENDOR: 'VENDOR' });

const DATA_SCOPE_BY_ROLE = Object.freeze({
  [SUPER_ADMIN]: DATA_SCOPE.ALL,
  [ADMIN]: DATA_SCOPE.SITE,
  [ADMIN_WORKER]: DATA_SCOPE.VENDOR,
  [WORKER]: DATA_SCOPE.VENDOR,
});

/**
 * Data scope of a user (primary role), from the BRD: Super Admin global, Admin per site,
 * Admin Worker and Worker per vendor. The backend filters the data; the UI uses this to show
 * the right context (site switcher, vendor label) and to hide filters that make no sense.
 * @param {{ roles?: readonly string[] } | null | undefined} user
 */
export function getDataScope(user) {
  const role = getPrimaryRole(user?.roles);
  return role ? DATA_SCOPE_BY_ROLE[role] : DATA_SCOPE.VENDOR;
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
