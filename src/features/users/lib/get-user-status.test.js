import { describe, expect, it } from 'vitest';
import { getUserStatus } from '@/features/users/lib/get-user-status';

const NOW = new Date('2026-10-14T03:00:00Z');
const base = { is_active: true, locked_until: null, must_change_password: false };

describe('getUserStatus', () => {
  it.each([
    [{}, 'ACTIVE'],
    [{ is_active: false, must_change_password: true }, 'INACTIVE'],
    [{ locked_until: '2026-10-14T03:10:00Z', must_change_password: true }, 'LOCKED'],
    [{ locked_until: '2026-10-14T02:50:00Z' }, 'ACTIVE'],
    [{ must_change_password: true }, 'MUST_CHANGE_PASSWORD'],
  ])('%j → %s', (patch, expected) => {
    expect(getUserStatus({ ...base, ...patch }, NOW)).toBe(expected);
  });
});
