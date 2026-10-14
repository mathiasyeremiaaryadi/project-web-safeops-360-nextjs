'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { itemKeys } from '@/features/items/api/keys';
import { itemSchema } from '@/features/items/api/schemas';

const LOOKUP_KEY = ['lookups', 'items'];

/** Create (`POST /items`) or update (`PATCH /items/{id}`). */
export function useSaveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id?: string, body: Record<string, unknown> }} input */
    mutationFn: ({ id, body }) =>
      apiRequest({
        method: id ? 'patch' : 'post',
        path: id ? `v1/items/${id}` : 'v1/items',
        json: body,
        schema: itemSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: LOOKUP_KEY });
    },
  });
}

/** Deactivate / reactivate. */
export function useChangeItemStatus() {
  return useMasterStatusChange({ path: 'items', invalidate: [itemKeys.lists(), LOOKUP_KEY] });
}
