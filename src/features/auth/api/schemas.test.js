import { describe, expect, it } from 'vitest';
import {
  changePasswordFormSchema,
  evaluatePasswordRules,
  loginRequestSchema,
  meResponseSchema,
} from '@/features/auth/api/schemas';

describe('loginRequestSchema', () => {
  it('trims and lowercases the username', () => {
    expect(loginRequestSchema.parse({ username: '  Budi.Santoso ', password: 'x' })).toEqual({
      username: 'budi.santoso',
      password: 'x',
    });
  });
});

describe('changePasswordFormSchema', () => {
  const base = {
    current_password: 'Kp7mw2Rq',
    new_password: 'baru12345',
    confirm_password: 'baru12345',
  };

  it('accepts a valid change', () => {
    expect(changePasswordFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a confirmation mismatch', () => {
    const result = changePasswordFormSchema.safeParse({ ...base, confirm_password: 'baru12346' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['confirm_password'],
      message: 'Password baru tidak cocok',
    });
  });

  it('rejects a new password equal to the current one', () => {
    const result = changePasswordFormSchema.safeParse({
      current_password: 'sama12345',
      new_password: 'sama12345',
      confirm_password: 'sama12345',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['new_password'],
      message: 'Password baru harus berbeda dari password lama',
    });
  });

  it.each(['pendek1', 'hanyahuruf', '123456789'])('rejects weak password %s', (pwd) => {
    const result = changePasswordFormSchema.safeParse({
      ...base,
      new_password: pwd,
      confirm_password: pwd,
    });
    expect(result.success).toBe(false);
  });
});

describe('evaluatePasswordRules', () => {
  it('reports every rule', () => {
    expect(evaluatePasswordRules('abcdefgh', '')).toEqual({
      minLength: true,
      hasLetter: true,
      hasDigit: false,
      matches: false,
    });
    expect(evaluatePasswordRules('abcdefg1', 'abcdefg1')).toEqual({
      minLength: true,
      hasLetter: true,
      hasDigit: true,
      matches: true,
    });
  });
});

describe('meResponseSchema', () => {
  it('rejects unknown roles', () => {
    const result = meResponseSchema.safeParse({
      id: '6f1c2a0e-6c3b-4b8e-9a51-1d2f3e4a5b61',
      username: 'x',
      full_name: null,
      roles: ['ROOT'],
      must_change_password: false,
      scopes: { site_ids: [], vendor_ids: [] },
    });
    expect(result.success).toBe(false);
  });
});
