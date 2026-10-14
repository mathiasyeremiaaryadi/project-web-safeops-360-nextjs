'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { toFormData, UPLOAD_TIMEOUT_MS } from '@/lib/api/form-data';
import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { inventoryKeys } from '@/features/inventories/api/keys';

/**
 * Create (`POST /inventories`) or update (`PATCH /inventories/{id}`), multipart with an
 * optional photo. The response is not read: the list/detail are refetched.
 */
export function useSaveInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id?: string, fields: Record<string, string | number | Blob | undefined> }} input */
    mutationFn: ({ id, fields }) =>
      apiRequest({
        method: id ? 'patch' : 'post',
        path: id ? `v1/inventories/${id}` : 'v1/inventories',
        body: toFormData(fields),
        timeout: UPLOAD_TIMEOUT_MS,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      if (id) queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
    },
  });
}

/** Deactivate / reactivate. @param {string} [id] */
export function useChangeInventoryStatus(id) {
  return useMasterStatusChange({
    path: 'inventories',
    multipart: true,
    invalidate: [inventoryKeys.lists(), ...(id ? [inventoryKeys.detail(id)] : [])],
  });
}
