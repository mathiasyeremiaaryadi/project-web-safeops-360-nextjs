'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { refreshAccessToken } from '@/lib/api/client';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { ROUTES } from '@/lib/constants';

/**
 * On the login page: if the user already has a session (in memory, or restorable from the
 * refresh cookie), go straight to the home page. The login form stays usable meanwhile.
 */
export function useRedirectIfAuthenticated() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const { status, accessToken } = useSessionStore.getState();

    if (status === 'authenticated' || accessToken) {
      router.replace(ROUTES.HOME);
      return undefined;
    }
    if (status === 'unauthenticated') return undefined;

    refreshAccessToken().then((token) => {
      if (!cancelled && token) router.replace(ROUTES.HOME);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);
}
