'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { siteKeys } from '@/features/sites/api/keys';
import { siteSchema } from '@/features/sites/api/schemas';

const LOOKUP_KEY = ['lookups', 'sites'];

/** Create (`POST /sites`) or update (`PATCH /sites/{id}`). */
export function useSaveSite() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id?: string, body: Record<string, unknown> }} input */
    mutationFn: ({ id, body }) =>
      apiRequest({
        method: id ? 'patch' : 'post',
        path: id ? `v1/sites/${id}` : 'v1/sites',
        json: body,
        schema: siteSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: LOOKUP_KEY });
    },
  });
}

/** Deactivate / reactivate a site. */
export function useChangeSiteStatus() {
  return useMasterStatusChange({ path: 'sites', invalidate: [siteKeys.lists(), LOOKUP_KEY] });
}
