import { z } from 'zod';
import { ROLES } from '@/lib/constants';

/*
 * Auth contract between the browser and the BFF (`/api/auth/*`), shared by client and server.
 * The user profile is passed through unchanged from Go `GET /api/v1/auth/me`.
 * The Go token contract lives server-side in `src/server/go/session-tokens.js`.
 * Every assumption is listed in docs/ASSUMPTIONS.md and must be confirmed with the Go team.
 */

// ---------- Responses ----------

export const roleSchema = z.enum([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.ADMIN_WORKER,
  ROLES.WORKER,
]);

const ROLE_CODES = Object.values(ROLES);

/**
 * Normalises the roles sent by Go: `["SUPER_ADMIN"]`, `[{ "code": "SUPER_ADMIN" }]`,
 * `[{ "name": "super_admin" }]` or a single `"role"` string. Unknown roles are dropped.
 * @param {unknown} value
 * @returns {string[]}
 */
function toRoleCodes(value) {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((role) =>
      typeof role === 'string' ? role : (role?.code ?? role?.name ?? role?.role ?? ''),
    )
    .map((role) => String(role).trim().toUpperCase())
    .filter((role) => ROLE_CODES.includes(role));
}

/** Scope ids from `scopes.site_ids`, top-level `site_ids` or `sites: [{ id }]`. */
const idList = z.preprocess(
  (value) =>
    Array.isArray(value) ? value.map((item) => (typeof item === 'object' ? item?.id : item)) : [],
  z.array(z.coerce.string()),
);

/**
 * The user's sites `{ id, name? }` from the shapes Go may send: `scopes.sites` / `sites` as
 * objects or ids, `scopes.site_ids` / `site_ids`, or `scopes` as a list of `{ site_id, site_name }`
 * rows. Names are kept when present, so the app can show them even if `GET /sites` fails.
 * @param {any} user
 * @returns {{ id: unknown, name?: unknown }[]}
 */
function toSiteScope(user) {
  if (Array.isArray(user.scopes)) {
    return user.scopes
      .filter((row) => row?.site_id ?? row?.site?.id)
      .map((row) => ({ id: row.site_id ?? row.site.id, name: row.site_name ?? row.site?.name }));
  }
  const list =
    [user.scopes?.sites, user.sites, user.scopes?.site_ids, user.site_ids].find(Array.isArray) ??
    [];
  return list.map((entry) =>
    entry && typeof entry === 'object'
      ? { id: entry.id ?? entry.site_id, name: entry.name ?? entry.site_name }
      : { id: entry },
  );
}

/**
 * The user's vendors `{ id, name? }` (one for Admin vendor / Worker), from `scopes.vendors` /
 * `vendors` as objects or ids, `scopes.vendor_ids` / `vendor_ids`, or `scopes` rows
 * `{ vendor_id, vendor_name }`.
 * @param {any} user
 * @returns {{ id: unknown, name?: unknown }[]}
 */
function toVendorScope(user) {
  if (Array.isArray(user.scopes)) {
    return user.scopes
      .filter((row) => row?.vendor_id ?? row?.vendor?.id)
      .map((row) => ({
        id: row.vendor_id ?? row.vendor.id,
        name: row.vendor_name ?? row.vendor?.name,
      }));
  }
  const list =
    [user.scopes?.vendors, user.vendors, user.scopes?.vendor_ids, user.vendor_ids].find(
      Array.isArray,
    ) ?? [];
  return list.map((entry) =>
    entry && typeof entry === 'object'
      ? { id: entry.id ?? entry.vendor_id, name: entry.name ?? entry.vendor_name }
      : { id: entry },
  );
}

const siteScopeSchema = z.array(
  z.object({
    id: z.coerce.string(),
    name: z.string().nullish().catch(null),
  }),
);

/**
 * `GET /auth/me` → 200, as returned by the real Go backend. Tolerant on purpose: the exact shape
 * is not documented (docs/ASSUMPTIONS.md A4), so wrappers (`data`/`user`), role objects and
 * missing optional fields are normalised here instead of failing the login.
 */
export const meResponseSchema = z.preprocess(
  (raw) => {
    const body = /** @type {any} */ (raw);
    const user = body?.data?.user ?? body?.data ?? body?.user ?? body;
    if (!user || typeof user !== 'object') return user;
    const hasId = (/** @type {{ id: unknown }} */ entry) =>
      entry.id !== undefined && entry.id !== null;
    const sites = toSiteScope(user).filter(hasId);
    const vendors = toVendorScope(user).filter(hasId);
    return {
      ...user,
      roles: toRoleCodes(user.roles ?? user.role),
      sites,
      vendors,
      scopes: {
        site_ids: sites.map((site) => site.id),
        vendor_ids: vendors.map((vendor) => vendor.id),
      },
    };
  },
  z.object({
    id: z.coerce.string(),
    username: z.string(),
    full_name: z.string().nullish(),
    email: z.string().nullish(),
    last_login_at: z.string().nullish(),
    roles: z.array(roleSchema),
    must_change_password: z.boolean().catch(false),
    scopes: z.object({ site_ids: idList, vendor_ids: idList }),
    /** The user's sites, with their names when `/auth/me` sends them. */
    sites: siteScopeSchema.catch([]),
    /** The user's vendor(s), with their names when `/auth/me` sends them. */
    vendors: siteScopeSchema.catch([]),
  }),
);

/** BFF `POST /api/auth/login` → 200. Tokens stay on the server (session cookie). */
export const loginResponseSchema = z.object({
  user: meResponseSchema,
});

// ---------- Requests / forms ----------

/** PRD: 3–30 chars, lowercase letters, digits, dot, underscore. Case-insensitive. */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

/** Login form. Only "required" checks on the client; credentials are validated by the server. */
export const loginFormSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

/** Body of `POST /api/auth/login` (forwarded to Go). Username is trimmed and lowercased. */
export const loginRequestSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_LETTER_PATTERN = /[A-Za-z]/;
export const PASSWORD_DIGIT_PATTERN = /\d/;

/** New password rules (PRD): min 8 characters, contains a letter and a digit. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'Minimal 8 karakter')
  .regex(PASSWORD_LETTER_PATTERN, 'Mengandung huruf')
  .regex(PASSWORD_DIGIT_PATTERN, 'Mengandung angka');

/** Change-password form. Shares its rules with the `PasswordRules` checklist. */
export const changePasswordFormSchema = z
  .object({
    current_password: z.string().min(1, 'Password wajib diisi'),
    new_password: newPasswordSchema,
    confirm_password: z.string(),
  })
  .refine((values) => values.confirm_password === values.new_password, {
    path: ['confirm_password'],
    message: 'Password baru tidak cocok',
  })
  .refine((values) => values.new_password !== values.current_password, {
    path: ['new_password'],
    message: 'Password baru harus berbeda dari password lama',
  });

/** Body of `PUT /api/auth/password` (forwarded to Go `PUT /api/v1/auth/password`) → 204. */
export const changePasswordRequestSchema = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(1).max(200),
});

/**
 * Evaluates the password checklist shown while typing.
 * @param {string} newPassword
 * @param {string} confirmPassword
 */
export function evaluatePasswordRules(newPassword, confirmPassword) {
  return {
    minLength: newPassword.length >= PASSWORD_MIN_LENGTH,
    hasLetter: PASSWORD_LETTER_PATTERN.test(newPassword),
    hasDigit: PASSWORD_DIGIT_PATTERN.test(newPassword),
    matches: newPassword.length > 0 && newPassword === confirmPassword,
  };
}

/** @typedef {z.infer<typeof meResponseSchema>} SessionUser */
/** @typedef {z.infer<typeof loginFormSchema>} LoginFormValues */
/** @typedef {z.infer<typeof changePasswordFormSchema>} ChangePasswordFormValues */
