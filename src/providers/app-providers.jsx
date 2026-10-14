'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { SerwistProvider } from '@serwist/turbopack/react';
import { Toaster } from '@/components/ui/sonner';
import { makeQueryClient } from '@/lib/query-client';
import { setupAuthClient } from '@/features/auth/lib/setup-auth-client';

setupAuthClient();

/**
 * Global client providers: TanStack Query, toasts and the service worker.
 * @param {{ children: import('react').ReactNode }} props
 */
export function AppProviders({ children }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    // The PWA worker only runs in production builds (no stale caches while developing).
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === 'development'}
      cacheOnNavigation={false}
      reloadOnOnline={false}
    >
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster position="top-center" />
      </QueryClientProvider>
    </SerwistProvider>
  );
}
