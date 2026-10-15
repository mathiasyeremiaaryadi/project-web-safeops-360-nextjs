'use client';

import { Button } from '@/components/ui/button';

/**
 * "Muat lebih banyak" under a card list (`useInfiniteListQuery`). Hidden on the last page.
 * @param {{ query: { hasNextPage: boolean, isFetchingNextPage: boolean, fetchNextPage: () => unknown } }} props
 */
export function LoadMore({ query }) {
  if (!query.hasNextPage) return null;
  return (
    <Button
      type="button"
      variant="outline"
      className="mx-auto mt-4 flex h-12 w-full bg-card sm:w-auto sm:px-8"
      disabled={query.isFetchingNextPage}
      onClick={() => query.fetchNextPage()}
    >
      {query.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
    </Button>
  );
}
