'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { refreshAccessToken } from '@/lib/api/client';
import { ROUTES } from '@/lib/constants';
import { getMe } from '@/features/auth/api/auth-api';
import { authKeys } from '@/features/auth/api/keys';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { buildLoginUrl } from '@/features/auth/lib/redirect';

/** Full-screen placeholder shown while the session is being restored. */
function SessionSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat sesi"
      data-testid="session-skeleton"
      className="flex min-h-dvh flex-1 flex-col"
    >
      <div className="flex h-[60px] items-center justify-between border-b bg-card px-4 sm:px-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="mx-auto w-full bg-card px-4 py-6 sm:mt-8 sm:max-w-[480px] sm:rounded-2xl sm:border sm:p-8 md:mt-14">
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="mt-6 h-7 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-8 h-11 w-full" />
        <Skeleton className="mt-4 h-11 w-full" />
        <Skeleton className="mt-6 h-12 w-full" />
      </div>
      <span className="sr-only">Memuat sesi…</span>
    </div>
  );
}

/**
 * Guards the `(protected)` route group.
 * 1. No access token in memory → restore it via `POST /auth/refresh` (cookie), showing a skeleton.
 * 2. Refresh fails → `/login?next=<current path>`.
 * 3. Load `/auth/me`; `must_change_password` forces `/change-password`.
 * 4. Fail closed: any error means "not signed in".
 * @param {{ children: import('react').ReactNode }} props
 */
export function AuthGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const {
      accessToken,
      user: currentUser,
      setAccessToken,
      setUser,
      setStatus,
      clear,
    } = useSessionStore.getState();
    if (accessToken && currentUser) return;

    const redirectToLogin = () => {
      clear();
      const { pathname: path, search } = window.location;
      router.replace(buildLoginUrl(`${path}${search}`));
    };

    (async () => {
      setStatus('loading');
      try {
        const token = accessToken ?? (await refreshAccessToken());
        if (!token) {
          redirectToLogin();
          return;
        }
        setAccessToken(token);
        const me = await queryClient.fetchQuery({
          queryKey: authKeys.me(),
          queryFn: getMe,
          staleTime: 0,
        });
        setUser(me);
      } catch {
        redirectToLogin();
      }
    })();
  }, [queryClient, router]);

  const mustChangePassword = status === 'authenticated' && user?.must_change_password === true;
  const needsPasswordRedirect = mustChangePassword && pathname !== ROUTES.CHANGE_PASSWORD;

  useEffect(() => {
    if (needsPasswordRedirect) router.replace(ROUTES.CHANGE_PASSWORD);
  }, [needsPasswordRedirect, router]);

  if (status !== 'authenticated' || !user || needsPasswordRedirect) {
    return <SessionSkeleton />;
  }

  return children;
}
