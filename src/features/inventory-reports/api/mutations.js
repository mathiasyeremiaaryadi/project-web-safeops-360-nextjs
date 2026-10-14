'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { inventoryReportKeys } from '@/features/inventory-reports/api/keys';
import { toInventoryReviewPayload } from '@/features/inventory-reports/lib/constants';

/** @typedef {import('@/features/inventory-reports/lib/constants').ReviewAction} ReviewAction */

/** `PATCH /inventory-reports/{id}/review` `{ status, review_reason? }` */
export function useReviewInventoryReport() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id: string, action: ReviewAction, reason?: string }} input */
    mutationFn: ({ id, action, reason }) =>
      apiRequest({
        method: 'patch',
        path: `v1/inventory-reports/${id}/review`,
        json: toInventoryReviewPayload(action, reason),
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryReportKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Approving a damage report may change the inventory's condition.
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
    },
  });
}
