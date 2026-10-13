'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logout } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { ROUTES } from '@/lib/constants';

/**
 * Logs out. The local session is always cleared, even if the API call fails
 * (e.g. offline), so the device never keeps a usable token.
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await logout();
      } catch {
        // Ignore: the session is cleared locally regardless.
      }
    },
    onSettled: () => {
      router.replace(ROUTES.LOGIN);
      useSessionStore.getState().clear();
      queryClient.clear();
    },
  });
}
