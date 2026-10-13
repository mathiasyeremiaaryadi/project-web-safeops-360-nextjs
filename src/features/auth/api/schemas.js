import { z } from 'zod';
import { ROLES } from '@/lib/constants';

/*
 * Single source of truth for the auth API contract (request & response shapes).
 * Every assumption here is also listed in docs/ASSUMPTIONS.md and must be confirmed
 * with the Go backend team.
 */

// ---------- Responses ----------

/** `POST /auth/login` and `POST /auth/refresh` → 200. Refresh token is an HttpOnly cookie. */
export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int().positive(),
});

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
  roles: z.array(roleSchema),
  must_change_password: z.boolean(),
  scopes: z.object({
    site_ids: z.array(z.uuid()),
    vendor_ids: z.array(z.uuid()),
  }),
});

// ---------- Requests / forms ----------

/** PRD: 3–30 chars, lowercase letters, digits, dot, underscore. Case-insensitive. */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

/** Login form. Only "required" checks on the client; credentials are validated by the server. */
export const loginFormSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

/** Body of `POST /auth/login`. Username is trimmed and lowercased before sending. */
export const loginRequestSchema = z.object({
  username: z.string().trim().toLowerCase(),
  password: z.string(),
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

/** Body of `PUT /auth/password` → 204. */
export const changePasswordRequestSchema = z.object({
  current_password: z.string(),
  new_password: z.string(),
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

/** @typedef {z.infer<typeof tokenResponseSchema>} TokenResponse */
/** @typedef {z.infer<typeof meResponseSchema>} SessionUser */
/** @typedef {z.infer<typeof loginFormSchema>} LoginFormValues */
/** @typedef {z.infer<typeof changePasswordFormSchema>} ChangePasswordFormValues */
