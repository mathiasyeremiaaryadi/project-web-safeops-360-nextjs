import { describe, expect, it } from 'vitest';
import { filterUsers } from '@/features/users/lib/filter-users';

const users = [
  { id: 'a', roles: ['SUPER_ADMIN'], is_active: true },
  { id: 'b', roles: ['ADMIN', 'ADMIN_WORKER'], is_active: false },
  { id: 'c', roles: ['WORKER'], is_active: true },
];
const ids = (rows) => rows.map((user) => user.id);

describe('filterUsers', () => {
  it('keeps everyone without filters', () => {
    expect(ids(filterUsers(users, {}))).toEqual(['a', 'b', 'c']);
  });

  it('filters by one of the roles and by active / inactive', () => {
    expect(ids(filterUsers(users, { role: 'ADMIN_WORKER' }))).toEqual(['b']);
    expect(ids(filterUsers(users, { status: 'ACTIVE' }))).toEqual(['a', 'c']);
    expect(ids(filterUsers(users, { status: 'INACTIVE' }))).toEqual(['b']);
    expect(ids(filterUsers(users, { role: 'WORKER', status: 'INACTIVE' }))).toEqual([]);
  });
});
