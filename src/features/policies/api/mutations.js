'use client';

import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { useSaveMutation } from '@/hooks/use-resource';
import { policyKeys } from '@/features/policies/api/keys';
import { policyFileSchema } from '@/features/policies/api/schemas';

/**
 * Upload (`POST /policies`) or edit (`PATCH /policies/{id}`, file optional), multipart:
 * `mutate({ id?, body })`.
 */
export const useSavePolicy = () =>
  useSaveMutation({ path: 'v1/policies', keys: policyKeys, multipart: true });

/** Deactivate / reactivate. */
export function useChangePolicyStatus() {
  return useMasterStatusChange({
    path: 'policies',
    multipart: true,
    invalidate: [policyKeys.lists()],
  });
}

/**
 * "Buka": fetches a fresh signed URL (valid 10 minutes) and opens it in a new tab. The URL is
 * not cached or stored anywhere — every click asks for a new one.
 *
 * The tab is opened synchronously in the click (before the request), otherwise the browser's
 * popup blocker stops it; it is then pointed at the PDF, or closed if the request fails.
 */
export function useOpenPolicyFile() {
  return useMutation({
    /** @param {string} id */
    mutationFn: async (id) => {
      const tab = window.open('', '_blank');
      try {
        const url = await apiRequest({
          method: 'get',
          path: `v1/policies/${id}/file`,
          schema: policyFileSchema,
        });
        if (tab) {
          tab.opener = null; // same protection as rel="noopener"
          tab.location.href = url;
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        tab?.close();
        throw error;
      }
    },
  });
}
