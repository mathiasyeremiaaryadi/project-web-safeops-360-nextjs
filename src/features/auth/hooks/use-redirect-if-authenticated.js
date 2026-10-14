'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { ROUTES } from '@/lib/constants';

/**
 * On the login page: if the user already has a valid session cookie, go straight to the home
 * page. The login form stays usable meanwhile (no blank screen on a slow connection).
 */
export function useRedirectIfAuthenticated() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const { status, setUser } = useSessionStore.getState();

    if (status === 'authenticated') {
      router.replace(ROUTES.HOME);
      return undefined;
    }
    // Just logged out / password changed: no need to ask the server.
    if (status === 'unauthenticated') return undefined;

    getMe({ probe: true })
      .then((user) => {
        if (cancelled) return;
        setUser(user);
        router.replace(ROUTES.HOME);
      })
      .catch(() => {
        // No session: stay on the login page.
      });
    return () => {
      cancelled = true;
    };
  }, [router]);
}
