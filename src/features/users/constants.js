import { ROLE_LABELS, ROLES } from '@/lib/constants';

/** Derived account status (see lib/get-user-status.js). */
export const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  LOCKED: 'LOCKED',
  MUST_CHANGE_PASSWORD: 'MUST_CHANGE_PASSWORD',
});

export const USER_STATUS_BADGES = Object.freeze({
  [USER_STATUS.ACTIVE]: { label: 'Aktif', variant: 'success' },
  [USER_STATUS.INACTIVE]: { label: 'Nonaktif', variant: 'neutral' },
  [USER_STATUS.LOCKED]: { label: 'Terkunci', variant: 'danger' },
  [USER_STATUS.MUST_CHANGE_PASSWORD]: { label: 'Wajib ganti password', variant: 'warning' },
});

export const ROLE_BADGES = Object.freeze({
  [ROLES.SUPER_ADMIN]: { label: ROLE_LABELS.SUPER_ADMIN, variant: 'dark' },
  [ROLES.ADMIN]: { label: ROLE_LABELS.ADMIN, variant: 'info' },
  [ROLES.ADMIN_WORKER]: { label: ROLE_LABELS.ADMIN_WORKER, variant: 'revision' },
  [ROLES.WORKER]: { label: ROLE_LABELS.WORKER, variant: 'neutral' },
});

/** Role cards of the user form, in display order. */
export const ROLE_OPTIONS = Object.freeze([
  {
    value: ROLES.SUPER_ADMIN,
    label: ROLE_LABELS.SUPER_ADMIN,
    description: 'Semua site dan vendor',
  },
  {
    value: ROLES.ADMIN,
    label: ROLE_LABELS.ADMIN,
    description: 'Semua vendor di site yang ditugaskan',
  },
  {
    value: ROLES.ADMIN_WORKER,
    label: ROLE_LABELS.ADMIN_WORKER,
    description: 'Data vendornya sendiri',
  },
  { value: ROLES.WORKER, label: ROLE_LABELS.WORKER, description: 'Tugas dan data pribadinya' },
]);

/** Roles that need exactly one vendor (FR-18). */
export const VENDOR_SCOPED_ROLES = Object.freeze([ROLES.ADMIN_WORKER, ROLES.WORKER]);

/** List filters. `status` values are sent as `?status=` (docs/ASSUMPTIONS.md). */
export const USER_ROLE_FILTERS = Object.freeze([
  { value: '', label: 'Semua role' },
  ...ROLE_OPTIONS.map((role) => ({ value: role.value, label: role.label })),
]);

export const USER_STATUS_FILTERS = Object.freeze([
  { value: '', label: 'Semua status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Nonaktif' },
]);

export const USERNAME_HINT =
  '3–30 karakter: huruf kecil, angka, titik, underscore. Tidak bisa diubah nanti.';

/** Every role/scope change, deactivation or password reset signs the user out (FR-12). */
export const SIGN_OUT_WARNING =
  'Mengubah role, menonaktifkan, atau mereset password akan mengeluarkan user dari semua perangkat.';
