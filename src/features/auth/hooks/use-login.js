'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getMe, login } from '@/features/auth/api/auth-api';
import { authKeys } from '@/features/auth/api/keys';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { getSafeRedirect } from '@/features/auth/lib/redirect';
import { ROUTES } from '@/lib/constants';

/**
 * Login flow: store the access token in memory, load `/auth/me`, then redirect to
 * `/change-password` (when required) or to the validated `next` path.
 * @param {{ next?: string | null }} [options]
 */
export function useLogin({ next = null } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    /** @param {import('@/features/auth/api/schemas').LoginFormValues} values */
    mutationFn: async (values) => {
      const { setAccessToken, setUser, clear } = useSessionStore.getState();
      const tokens = await login(values);
      setAccessToken(tokens.access_token);
      try {
        const user = await queryClient.fetchQuery({
          queryKey: authKeys.me(),
          queryFn: getMe,
          staleTime: 0,
        });
        setUser(user);
        return user;
      } catch (error) {
        clear();
        throw error;
      }
    },
    onSuccess: (user) => {
      router.replace(user.must_change_password ? ROUTES.CHANGE_PASSWORD : getSafeRedirect(next));
    },
  });
}
