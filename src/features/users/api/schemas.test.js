import { describe, expect, it } from 'vitest';
import {
  createUserFormSchema,
  toAccessPayload,
  toCreateUserPayload,
} from '@/features/users/api/schemas';

const site = { value: 's1', label: 'PLTU Paiton' };
const vendor = { value: 'v1', label: 'PT Bersih Jaya' };
const valid = {
  full_name: 'Agus Pratama',
  username: ' Agus.Pratama ',
  email: '',
  phone: '',
  roles: ['WORKER'],
  sites: [],
  vendor,
};

/** @param {object} patch */
const issuesOf = (patch) =>
  createUserFormSchema
    .safeParse({ ...valid, ...patch })
    .error?.issues.map((i) => [i.path.join('.'), i.message]) ?? [];

describe('user form validation (FR-18)', () => {
  it('accepts a worker with exactly one vendor and normalises the username', () => {
    const result = createUserFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.username).toBe('agus.pratama');
  });

  it('requires at least one role', () => {
    expect(issuesOf({ roles: [] })).toContainEqual(['roles', 'Pilih minimal satu role.']);
  });

  it('requires a vendor for Worker and Admin Worker', () => {
    expect(issuesOf({ roles: ['ADMIN_WORKER'], vendor: null })).toContainEqual([
      'vendor',
      'Admin Worker dan Worker wajib tepat satu vendor.',
    ]);
  });

  it('requires at least one site for Admin', () => {
    expect(issuesOf({ roles: ['ADMIN'], vendor: null })).toContainEqual([
      'sites',
      'Role Admin wajib minimal satu site.',
    ]);
    expect(issuesOf({ roles: ['ADMIN'], vendor: null, sites: [site] })).toEqual([]);
  });

  it('needs no scope for Super Admin', () => {
    expect(issuesOf({ roles: ['SUPER_ADMIN'], vendor: null })).toEqual([]);
  });

  it.each(['ab', 'Agus Pratama', 'agus-pratama', 'a'.repeat(31)])(
    'rejects username %s',
    (username) => {
      expect(issuesOf({ username }).map(([path]) => path)).toContain('username');
    },
  );
});

describe('payload mapping', () => {
  it('sends only the scopes each role uses', () => {
    expect(toAccessPayload({ roles: ['SUPER_ADMIN'], sites: [site], vendor })).toEqual({
      roles: ['SUPER_ADMIN'],
      site_ids: [],
      vendor_ids: [],
    });
    expect(toAccessPayload({ roles: ['ADMIN', 'WORKER'], sites: [site], vendor })).toEqual({
      roles: ['ADMIN', 'WORKER'],
      site_ids: ['s1'],
      vendor_ids: ['v1'],
    });
  });

  it('omits empty optional profile fields and the password', () => {
    const payload = toCreateUserPayload(createUserFormSchema.parse(valid));
    expect(payload).toEqual({
      username: 'agus.pratama',
      full_name: 'Agus Pratama',
      email: undefined,
      phone: undefined,
      roles: ['WORKER'],
      site_ids: [],
      vendor_ids: ['v1'],
    });
    expect(payload).not.toHaveProperty('password');
  });
});
