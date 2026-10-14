'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logout, logoutAll } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { ROUTES } from '@/lib/constants';

/**
 * Ends the local session and returns to the login page.
 * @param {ReturnType<typeof useRouter>} router
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 */
function endLocalSession(router, queryClient) {
  router.replace(ROUTES.LOGIN);
  useSessionStore.getState().clear();
  queryClient.clear();
}

/**
 * Logs out of this device. The local session is always cleared, even if the API call fails
 * (e.g. offline), so the device never keeps a usable session.
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
    onSettled: () => endLocalSession(router, queryClient),
  });
}

/** Logs out of every device (`POST /auth/logout-all`). Errors are shown to the user. */
export function useLogoutAll() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutAll,
    onSuccess: () => endLocalSession(router, queryClient),
  });
}
