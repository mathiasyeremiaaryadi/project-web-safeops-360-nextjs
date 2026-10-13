'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { changePassword } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { AUTH_MESSAGES } from '@/features/auth/lib/error-messages';
import { ROUTES } from '@/lib/constants';

/**
 * Changes the user's password. On success every refresh token is revoked by the backend
 * (PRD FR-12), so the local session is cleared and the user signs in again.
 */
export function useChangePassword() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    /** @param {{ current_password: string, new_password: string }} values */
    mutationFn: (values) =>
      changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      }),
    onSuccess: () => {
      router.replace(ROUTES.LOGIN);
      useSessionStore.getState().clear();
      queryClient.clear();
      toast.success(AUTH_MESSAGES.PASSWORD_CHANGED);
    },
  });
}
