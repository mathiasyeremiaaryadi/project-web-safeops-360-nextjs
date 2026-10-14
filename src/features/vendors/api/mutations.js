'use client';

import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { useSaveMutation } from '@/hooks/use-resource';
import { lookupKey } from '@/lib/api/query-keys';
import { vendorKeys } from '@/features/vendors/api/keys';

/** Create (`POST /vendors`) or update (`PATCH /vendors/{id}`) a vendor: `mutate({ id?, body })`. */
export const useSaveVendor = () =>
  useSaveMutation({ path: 'v1/vendors', keys: vendorKeys, alsoInvalidate: [lookupKey('vendors')] });

/** Deactivate (`DELETE`) / reactivate (`PATCH { status: ACTIVE }`) a vendor. */
export const useChangeVendorStatus = () =>
  useMasterStatusChange({
    path: 'vendors',
    invalidate: [vendorKeys.lists(), lookupKey('vendors')],
  });
