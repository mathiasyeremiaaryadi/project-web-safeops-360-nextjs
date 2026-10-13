import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

/**
 * Retry policy: never retry 4xx, retry 5xx / network errors at most once.
 * @param {number} failureCount
 * @param {unknown} error
 */
export function shouldRetryQuery(failureCount, error) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

/** Creates a QueryClient with the app-wide defaults. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
