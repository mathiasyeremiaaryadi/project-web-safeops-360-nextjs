import { z } from 'zod';
import { listResponseSchema } from '@/lib/api/lists';
import { ROLES } from '@/lib/constants';
import { VENDOR_SCOPED_ROLES } from '@/features/users/constants';

/*
 * User API contract (Postman "Users" + BRD 8.2). Response fields beyond the documented request
 * fields are assumptions — docs/ASSUMPTIONS.md (U1–U4).
 */

export const roleSchema = z.enum([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.ADMIN_WORKER,
  ROLES.WORKER,
]);

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  full_name: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  roles: z.array(roleSchema),
  is_active: z.boolean().catch(true),
  locked_until: z.string().nullish(),
  must_change_password: z.boolean().catch(false),
  last_login_at: z.string().nullish(),
  scopes: z
    .object({ site_ids: z.array(z.string()).catch([]), vendor_ids: z.array(z.string()).catch([]) })
    .catch({ site_ids: [], vendor_ids: [] }),
});

/** @typedef {z.infer<typeof userSchema>} User */

export const userListSchema = listResponseSchema(userSchema);

/** `POST /users` → 201 `{ user, temporary_password? }` (Postman test script reads `user.id`). */
export const createUserResponseSchema = z.object({
  user: userSchema,
  temporary_password: z.string().nullish(),
});

/** `POST /users/{id}/reset-password` → `{ temporary_password }` (assumed). */
export const resetPasswordResponseSchema = z.object({
  temporary_password: z.string().nullish(),
});

// ---------- Forms ----------

/** PRD Auth: 3–30 chars, lowercase letters, digits, dot, underscore. */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

const optionSchema = z.object({ value: z.string(), label: z.string() });

/** Role + scope part, shared by the create form and the access form (FR-18). */
export const accessFormSchema = z
  .object({
    roles: z.array(roleSchema).min(1, 'Pilih minimal satu role.'),
    sites: z.array(optionSchema),
    vendor: optionSchema.nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.roles.includes(ROLES.ADMIN) && values.sites.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['sites'],
        message: 'Role Admin wajib minimal satu site.',
      });
    }
    if (values.roles.some((role) => VENDOR_SCOPED_ROLES.includes(role)) && !values.vendor) {
      ctx.addIssue({
        code: 'custom',
        path: ['vendor'],
        message: 'Admin Worker dan Worker wajib tepat satu vendor.',
      });
    }
  });

export const profileFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(120),
  email: z.union([z.literal(''), z.email('Format email tidak valid.')]),
  phone: z.union([
    z.literal(''),
    z.string().regex(/^\+?\d{8,15}$/, 'No. HP hanya angka, 8–15 digit.'),
  ]),
});

export const createUserFormSchema = profileFormSchema
  .extend({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(USERNAME_PATTERN, 'Username 3–30 karakter: huruf kecil, angka, titik, underscore.'),
  })
  .and(accessFormSchema);

/**
 * Role + scope payload. Super Admin has no scope; sites only for Admin, one vendor only for
 * Admin Worker/Worker (FR-18).
 * @param {{ roles: string[], sites: { value: string }[], vendor: { value: string } | null }} values
 */
export function toAccessPayload(values) {
  const needsSites = values.roles.includes(ROLES.ADMIN);
  const needsVendor = values.roles.some((role) => VENDOR_SCOPED_ROLES.includes(role));
  return {
    roles: values.roles,
    site_ids: needsSites ? values.sites.map((site) => site.value) : [],
    vendor_ids: needsVendor && values.vendor ? [values.vendor.value] : [],
  };
}

/**
 * `POST /users` body. Password is omitted so the backend generates a temporary one.
 * @param {z.infer<typeof createUserFormSchema>} values
 */
export function toCreateUserPayload(values) {
  return {
    username: values.username,
    full_name: values.full_name,
    email: values.email || undefined,
    phone: values.phone || undefined,
    ...toAccessPayload(values),
  };
}
