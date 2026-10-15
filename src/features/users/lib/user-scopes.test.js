import { describe, expect, it } from 'vitest';
import { userSchema } from '@/features/users/api/schemas';
import { describeScope } from '@/features/users/lib/describe-scope';

const noLookup = { siteName: () => '—', vendorName: () => '—' };

describe('user scopes', () => {
  it('reads the backend shape: scopes [{ type, id, name }] and top-level site_ids', () => {
    const user = userSchema.parse({
      id: '03ce',
      username: 'admin.adipala',
      full_name: 'Admin PLTU Adipala',
      is_active: true,
      roles: ['ADMIN'],
      site_ids: ['aec1'],
      scopes: [{ type: 'SITE', id: 'aec1', code: 'ADIPALA', name: 'PLTU Adipala' }],
    });
    expect(user.scopes).toEqual({
      site_ids: ['aec1'],
      vendor_ids: [],
      names: { aec1: 'PLTU Adipala' },
    });
    // The name comes with the scope: no lookup needed.
    expect(describeScope(user, noLookup)).toBe('Site: PLTU Adipala');
  });

  it('reads vendor scopes and the older object shape', () => {
    const worker = userSchema.parse({
      id: 'w1',
      username: 'agus',
      roles: ['WORKER'],
      scopes: [{ type: 'VENDOR', id: 'v1', name: 'PT Bersih Jaya' }],
    });
    expect(describeScope(worker, noLookup)).toBe('Vendor: PT Bersih Jaya');

    const old = userSchema.parse({
      id: 'a2',
      username: 'siti',
      roles: ['ADMIN'],
      scopes: { site_ids: ['s1'] },
    });
    expect(old.scopes).toEqual({ site_ids: ['s1'], vendor_ids: [], names: {} });
    expect(describeScope(old, { ...noLookup, siteName: () => 'PLTU Paiton' })).toBe(
      'Site: PLTU Paiton',
    );
  });
});
