'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeRoute } from '@/config/navigation';
import { useSession } from '@/features/auth/hooks/use-session';

/** `/` sends the user to the first page of their role (Super Admin: /dashboard). */
export function HomeRedirect() {
  const router = useRouter();
  const { user } = useSession();
  const home = getHomeRoute(user?.roles);

  useEffect(() => {
    router.replace(home);
  }, [router, home]);

  return null;
}
