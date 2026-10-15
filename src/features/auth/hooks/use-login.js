'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { login } from '@/features/auth/api/auth-api';
import { authKeys } from '@/features/auth/api/keys';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { getSafeRedirect } from '@/features/auth/lib/redirect';
import { ROUTES } from '@/lib/constants';
import { clearOtherUsersOfflineData } from '@/features/offline';

/**
 * Login flow: the BFF creates the session cookie and returns the profile; then redirect to
 * `/change-password` (when required) or to the validated `next` path.
 * @param {{ next?: string | null }} [options]
 */
export function useLogin({ next = null } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    /** @param {import('@/features/auth/api/schemas').LoginFormValues} values */
    mutationFn: (values) => login(values),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
      useSessionStore.getState().setUser(user);
      // Another user's offline data must not stay on a shared device.
      clearOtherUsersOfflineData(user.id).catch(() => {});
      router.replace(user.must_change_password ? ROUTES.CHANGE_PASSWORD : getSafeRedirect(next));
    },
  });
}
