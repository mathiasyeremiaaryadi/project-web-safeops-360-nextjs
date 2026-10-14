'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { vendorKeys } from '@/features/vendors/api/keys';

const LOOKUP_KEY = ['lookups', 'vendors'];

/**
 * Create (`POST /vendors`) or update (`PATCH /vendors/{id}`). The response body is not read:
 * the list is refetched instead, so the save does not depend on the response envelope.
 */
export function useSaveVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id?: string, body: Record<string, unknown> }} input */
    mutationFn: ({ id, body }) =>
      apiRequest({
        method: id ? 'patch' : 'post',
        path: id ? `v1/vendors/${id}` : 'v1/vendors',
        json: body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      queryClient.invalidateQueries({ queryKey: LOOKUP_KEY });
    },
  });
}

/** Deactivate / reactivate. */
export function useChangeVendorStatus() {
  return useMasterStatusChange({ path: 'vendors', invalidate: [vendorKeys.lists(), LOOKUP_KEY] });
}
