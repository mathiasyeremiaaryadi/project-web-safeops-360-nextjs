import { vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { Toaster } from '@/components/ui/sonner';
import { makeQueryClient } from '@/lib/query-client';

/**
 * Renders `ui` inside the app's client providers (without the service worker).
 * @param {import('react').ReactElement} ui
 * @param {{ searchParams?: string }} [options] Initial URL query (nuqs).
 */
export function renderWithProviders(ui, { searchParams = '' } = {}) {
  const queryClient = makeQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <NuqsTestingAdapter searchParams={searchParams} hasMemory>
        {ui}
      </NuqsTestingAdapter>
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

/** Creates a fresh `next/navigation` router mock. */
export function createRouterMock() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
}
