import { describe, expect, it } from 'vitest';
import { withOwnVendor } from '@/features/auth/hooks/use-current-vendor';

describe('withOwnVendor', () => {
  it('sets vendor_id on inventory / SOP payloads, replacing any other value', () => {
    expect(withOwnVendor({ item: 'APAR', vendor_id: 'other' }, 'v1')).toEqual({
      item: 'APAR',
      vendor_id: 'v1',
    });
    expect(withOwnVendor({ name: 'SOP' }, 'v1')).toEqual({ name: 'SOP', vendor_id: 'v1' });
  });

  it('sets a one-vendor list on user account payloads', () => {
    expect(withOwnVendor({ roles: ['WORKER'], site_ids: [], vendor_ids: [] }, 'v1')).toEqual({
      roles: ['WORKER'],
      site_ids: [],
      vendor_ids: ['v1'],
    });
  });
});
