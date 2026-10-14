'use client';

import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { useSaveMutation } from '@/hooks/use-resource';
import { inventoryKeys } from '@/features/inventories/api/keys';

/**
 * Create (`POST /inventories`) or update (`PATCH /inventories/{id}`), multipart with an optional
 * photo: `mutate({ id?, body })`.
 */
export const useSaveInventory = () =>
  useSaveMutation({ path: 'v1/inventories', keys: inventoryKeys, multipart: true });

/** Deactivate / reactivate. @param {string} [id] */
export function useChangeInventoryStatus(id) {
  return useMasterStatusChange({
    path: 'inventories',
    multipart: true,
    invalidate: [inventoryKeys.lists(), ...(id ? [inventoryKeys.detail(id)] : [])],
  });
}
