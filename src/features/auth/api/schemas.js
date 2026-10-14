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

/** `GET /auth/me` → 200. */
export const meResponseSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  full_name: z.string().nullable(),
  /** Optional profile fields (assumed, docs/ASSUMPTIONS.md A4). */
  email: z.string().nullish(),
  last_login_at: z.string().nullish(),
  roles: z.array(roleSchema),
  must_change_password: z.boolean(),
  scopes: z.object({
    site_ids: z.array(z.uuid()),
    vendor_ids: z.array(z.uuid()),
  }),
});

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
