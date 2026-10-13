'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { QueryClientProvider } from '@tanstack/react-query';
import { SerwistProvider } from '@serwist/turbopack/react';
import { Toaster } from '@/components/ui/sonner';
import { clientEnv } from '@/config/env';
import { makeQueryClient } from '@/lib/query-client';
import { setupAuthClient } from '@/features/auth/lib/setup-auth-client';

const isMocking = clientEnv.NEXT_PUBLIC_API_MOCKING === 'enabled';

setupAuthClient();

// Never bundled for SSR; tree-shaken out when mocking is disabled at build time.
const MockProvider =
  process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'
    ? dynamic(() => import('@/mocks/mock-provider').then((mod) => mod.MockProvider), {
        ssr: false,
      })
    : null;

/**
 * Global client providers: TanStack Query, toasts and the service worker.
 * @param {{ children: import('react').ReactNode }} props
 */
export function AppProviders({ children }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    // MSW and Serwist would both claim scope "/", so the PWA worker is off while mocking.
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={isMocking || process.env.NODE_ENV === 'development'}
      cacheOnNavigation={false}
      reloadOnOnline={false}
    >
      <QueryClientProvider client={queryClient}>
        {MockProvider ? <MockProvider>{children}</MockProvider> : children}
        <Toaster position="top-center" />
      </QueryClientProvider>
    </SerwistProvider>
  );
}
